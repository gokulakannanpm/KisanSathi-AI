import json
import logging
import os
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
import httpx

from app.services.farmer_service import farmer_service
from app.services.mandi_service import mandi_service
from app.services.recommendation_service import recommendation_service
from app.services.weather_service import weather_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/ai",
    tags=["AI Explainer Assistant"]
)

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "or": "Odia"
}


class ExplainRequest(BaseModel):
    farmer_id: Optional[str] = Field("demo_farmer_01", description="Farmer ID for context retrieval")
    question: Optional[str] = Field(None, description="User follow-up question if any")
    context: Optional[Dict[str, Any]] = Field(None, description="Optional additional context payload")
    language: Optional[str] = Field("en", description="Language code (e.g. en, hi, ta, mr)")


class ExplainResponse(BaseModel):
    explanation_text: str = Field(..., description="Detailed markdown/text explanation of farm decision")
    provider_used: str = Field(..., description="AI model or rule engine identifier")
    action_steps: List[str] = Field(default_factory=list, description="Step-by-step actionable advice")
    confidence: int = Field(95, description="Confidence percentage")
    reasoning: Optional[str] = Field(None, description="High-level reasoning summary")


def extract_action_steps(text: str) -> List[str]:
    """Extract action steps from Gemini response if present."""
    steps = []
    lines = text.split("\n")
    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            continue
        if cleaned.startswith(("- ", "* ", "• ", "1. ", "2. ", "3. ", "4. ", "5. ", "1)", "2)", "3)")):
            step_content = re.sub(r"^[-*•\d.()]+", "", cleaned).strip()
            if 5 < len(step_content) < 180:
                steps.append(step_content)
    return steps[:4]


def get_agricultural_demo_fallback(
    question: Optional[str],
    farmer: dict,
    weather: dict,
    rec: dict
) -> Dict[str, Any]:
    """Provide a predictable, context-aware agricultural fallback for demo questions."""
    name = farmer.get("name", "Farmer")
    district = farmer.get("district", "your region")
    crop_list = farmer.get("crops", ["cotton"])
    crop = crop_list[0] if crop_list else "crop"
    acres = farmer.get("land_size_acres", 2.5)
    rain_prob = weather.get("rain_probability", 65)

    if not question:
        base_text = rec.get("ai_explanation") or (
            f"Advisory for {name} ({acres} acres of {crop.title()} in {district}): "
            f"Current weather forecast shows {rain_prob}% rain probability. "
            f"Postponing scheduled chemical applications prevents input washout and financial loss."
        )
        return {
            "explanation_text": base_text,
            "action_steps": [
                f"Hold pesticide application until clear 8-hour weather window in {district}",
                "Inspect field drainage and soil moisture conditions",
                "Store pre-mixed inputs in dry covered storage"
            ]
        }

    q = question.strip().lower()

    if any(k in q for k in ["wait before spraying", "rain is expected", "rain expected", "why should i wait"]):
        explanation = (
            f"Chemical rainfastness requires at least 6 to 8 hours of dry weather following application. "
            f"With a {rain_prob}% rain probability in {district}, applying active compounds now will cause "
            f"chemical runoff, zero efficacy against target pests, and unnecessary re-purchase costs on your {acres}-acre {crop} farm."
        )
        steps = [
            f"Postpone spraying until radar confirms a clear 8-hour window in {district}",
            "Keep chemicals sealed in dry storage to avoid degradation",
            "Inspect field for pest density prior to rescheduled operation"
        ]

    elif any(k in q for k in ["heavy rain", "forecast", "what should i do"]):
        explanation = (
            f"When heavy rain is forecast for {district}: "
            f"1) Inspect and clear main field drainage channels to prevent root waterlogging in your {crop} field. "
            f"2) Pause all fertilizer and pesticide applications to prevent chemical leaching. "
            f"3) Ensure harvested produce is stored in dry, elevated, waterproof storage."
        )
        steps = [
            "Clear field perimeter drainage channels immediately",
            "Do not apply granular fertilizers or foliar sprays today",
            "Verify grain and harvest storage moisture protection"
        ]

    elif any(k in q for k in ["crop health", "improve crop", "improve my crop"]):
        explanation = (
            f"To improve overall {crop} crop health on your {acres}-acre holding in {district}: "
            f"1) Apply balanced NPK dosing aligned with current crop growth stage. "
            f"2) Follow weather-guided irrigation schedules to avoid soil moisture stress. "
            f"3) Conduct weekly field scouting to detect early pest or disease symptoms."
        )
        steps = [
            "Conduct regular soil moisture & nutrient monitoring",
            "Maintain proper weed management and plant spacing",
            "Apply crop protection inputs during optimal weather windows"
        ]

    elif any(k in q for k in ["check before spraying", "before spraying", "pesticides"]):
        explanation = (
            f"Essential checklist before spraying pesticides in {district}: "
            f"1) Weather Window: Confirm at least 6-8 hours of dry weather and wind speeds below 15 km/h. "
            f"2) Calibrated Dosage: Use exact recommended dosage per acre for your {acres}-acre {crop} field. "
            f"3) Personal Safety: Wear protective gloves and mask, and verify nozzle spray pattern."
        )
        steps = [
            "Verify 8-hour rain and wind velocity forecast",
            "Check sprayer nozzle pattern and pressure calibration",
            "Wear recommended personal protective safety equipment"
        ]

    else:
        explanation = (
            f"AI Service Note: The live AI service is operating in context-aware fallback mode. "
            f"For {name} in {district} ({acres} acres of {crop}): "
            f"Adhering to localized weather-guided advisories ensures optimal input cost savings and crop protection."
        )
        steps = [
            f"Monitor live weather updates for {district}",
            "Follow safe input application guidelines",
            "Consult regional agricultural advisory for specific crop queries"
        ]

    return {
        "explanation_text": explanation,
        "action_steps": steps
    }


def _call_gemini_api(api_key: str, system_context: str, user_prompt: str) -> tuple[Optional[str], Optional[str]]:
    """Call Google Gemini API using httpx REST or google-genai SDK fallback."""
    candidate_models = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-3.5-flash"]
    full_prompt = f"{system_context}\n\nFarmer Question:\n{user_prompt}"

    # 1. Try httpx REST API (Fast & lightweight)
    for model_name in candidate_models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 700}
            }
            with httpx.Client(timeout=20.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    try:
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        if text and text.strip():
                            return text.strip(), f"Google Gemini {model_name} (Live AI)"
                    except (KeyError, IndexError):
                        continue
                else:
                    logger.warning(f"Gemini REST model {model_name} returned HTTP {resp.status_code}")
        except Exception as rest_err:
            logger.warning(f"Gemini REST model {model_name} exception: {rest_err}")
            continue

    # 2. Try official google.genai SDK fallback
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        for model_name in candidate_models:
            try:
                config = types.GenerateContentConfig(
                    system_instruction=system_context,
                    temperature=0.3,
                    max_output_tokens=700
                )
                response = client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=config
                )
                if response and response.text and response.text.strip():
                    return response.text.strip(), f"Google Gemini {model_name} (Live AI)"
            except Exception as model_err:
                logger.warning(f"Gemini SDK call for model {model_name} failed: {model_err}")
                continue
    except Exception as sdk_err:
        logger.warning(f"Google GenAI SDK init error: {sdk_err}")

    return None, None


@router.post(
    "/explain",
    response_model=ExplainResponse,
    summary="Get detailed AI explanation for recommendations and advisories"
)
def explain_recommendation(request: ExplainRequest):
    farmer_id = request.farmer_id or "demo_farmer_01"
    question = request.question.strip() if request.question else None
    language_code = (request.language or "en").lower()
    language_name = LANGUAGE_NAMES.get(language_code, "English")

    # 1. Gather Context
    try:
        farmer = farmer_service.get_farmer_profile(farmer_id)
        weather = weather_service.get_current_weather(farmer_id)
        rec = recommendation_service.get_recommendation(farmer_id)
    except Exception as e:
        logger.warning(f"Failed to fetch farmer context for {farmer_id}: {e}")
        farmer = {"name": "Farmer", "district": "Nagpur", "state": "Maharashtra", "crops": ["cotton"], "land_size_acres": 2.5}
        weather = {"temp_c": 32, "condition": "Partly Cloudy", "rain_probability": 10}
        rec = {"headline": "Farm Advisory", "ai_explanation": "Advisory based on farm memory & weather conditions."}

    # 2. Check Gemini API Key
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    # 3. Attempt Live Gemini Call if API Key exists
    llm_output = None
    provider_used = "Rule Engine Fallback (Offline)"

    if gemini_key:
        system_context = (
            "You are KisanSathi AI, a helpful agricultural assistant for Indian farmers. "
            f"Provide practical, clear and concise farming guidance. Prefer answering in {language_name}. "
            "Use simple language and explain agricultural terminology when needed. "
            "When discussing government schemes, mandi/MSP prices, or weather, do not invent current values or scheme details. "
            "If live application context is provided below, use that data rather than guessing. "
            "Clearly distinguish general agricultural knowledge from current/live information. "
            "Never claim that an API, database, weather service, scheme database, or mandi service was consulted unless it actually was.\n\n"
            f"Farmer Profile: {farmer.get('name', 'Farmer')}, Location: {farmer.get('district', 'Nagpur')}, {farmer.get('state', 'Maharashtra')}.\n"
            f"Land Holding: {farmer.get('land_size_acres', 2.5)} Acres, Main Crops: {', '.join(farmer.get('crops', ['cotton']))}.\n"
            f"Current Weather: {weather.get('condition', 'Clear')}, Temp: {weather.get('temp_c', 30)}°C, Rain Probability: {weather.get('rain_probability', 10)}%.\n"
            f"Current Farm Advisory Headline: {rec.get('headline', 'N/A')}.\n"
            f"Target Response Language: {language_name}."
        )

        user_query_text = question or f"Explain why the advisory '{rec.get('headline')}' is best for my farm and what steps I should take."
        llm_output, provider_used = _call_gemini_api(gemini_key, system_context, user_query_text)

    # 4. Return Live Gemini Response if successful
    if llm_output:
        action_steps = extract_action_steps(llm_output)
        if not action_steps:
            action_steps = [
                f"Adhere to recommended operation window for {farmer.get('district', 'your region')}",
                "Verify current field moisture and drainage before application",
                "Monitor regional APMC mandi price trends before selling produce"
            ]
        return ExplainResponse(
            explanation_text=llm_output,
            provider_used=provider_used or "Google Gemini (Live AI)",
            action_steps=action_steps,
            confidence=rec.get("confidence", 95),
            reasoning=rec.get("reasoning", "Live Gemini agricultural context synthesis")
        )

    # 5. Fallback if Gemini unavailable or no key
    fallback_data = get_agricultural_demo_fallback(question, farmer, weather, rec)
    return ExplainResponse(
        explanation_text=fallback_data["explanation_text"],
        provider_used=provider_used,
        action_steps=fallback_data["action_steps"],
        confidence=rec.get("confidence", 95),
        reasoning=rec.get("reasoning", "Farm context processing")
    )
