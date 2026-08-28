import json
import logging
import os
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


def _call_gemini_api(api_key: str, system_context: str, user_prompt: str) -> Optional[str]:
    """Call Google Gemini 1.5 Flash API via REST using httpx."""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        full_prompt = f"{system_context}\n\nFarmer Query / Focus:\n{user_prompt}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": full_prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 800
            }
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                try:
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                except (KeyError, IndexError):
                    logger.warning("Gemini API response structure unexpected")
                    return None
            else:
                logger.warning(f"Gemini API error (HTTP {resp.status_code}): {resp.text}")
                return None
    except Exception as e:
        logger.warning(f"Gemini API exception: {e}")
        return None


def _call_openai_api(api_key: str, system_context: str, user_prompt: str) -> Optional[str]:
    """Call OpenAI GPT API via REST using httpx."""
    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": system_context},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 800
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                try:
                    return data["choices"][0]["message"]["content"]
                except (KeyError, IndexError):
                    logger.warning("OpenAI API response structure unexpected")
                    return None
            else:
                logger.warning(f"OpenAI API error (HTTP {resp.status_code}): {resp.text}")
                return None
    except Exception as e:
        logger.warning(f"OpenAI API exception: {e}")
        return None


@router.post(
    "/explain",
    response_model=ExplainResponse,
    summary="Get detailed AI explanation for recommendations and advisories"
)
def explain_recommendation(request: ExplainRequest):
    farmer_id = request.farmer_id or "demo_farmer_01"
    question = request.question.strip() if request.question else None

    # 1. Gather context data
    try:
        farmer = farmer_service.get_farmer_profile(farmer_id)
        diary = farmer_service.get_diary_entries(farmer_id)
        weather = weather_service.get_current_weather(farmer_id)
        mandi = mandi_service.get_prices()
        rec = recommendation_service.get_recommendation(farmer_id)
    except Exception as e:
        logger.warning(f"Failed to fetch complete farmer context for {farmer_id}: {e}")
        farmer = {"name": "Farmer", "district": "Nagpur", "state": "Maharashtra", "crops": ["cotton"], "land_size_acres": 2.5}
        diary = []
        weather = {"temp_c": 32, "condition": "Partly Cloudy", "rain_probability": 10}
        mandi = []
        rec = {"headline": "Farm Advisory", "ai_explanation": "Advisory based on farm memory & weather conditions."}

    # 2. Check for LLM API Key Configuration
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    provider_setting = os.getenv("LLM_PROVIDER", "rule_based").strip().lower()

    # 3. Build System Context for LLM / AI Prompt
    system_context = (
        f"You are KisanSathi AI, an expert agricultural advisor in India.\n"
        f"Farmer Context:\n"
        f"- Name: {farmer.get('name')}\n"
        f"- Location: {farmer.get('district')}, {farmer.get('state')}\n"
        f"- Crops: {', '.join(farmer.get('crops', []))}\n"
        f"- Land Size: {farmer.get('land_size_acres')} Acres\n"
        f"- Current Weather: {weather.get('condition')}, {weather.get('temp_c')}°C, Rain prob: {weather.get('rain_probability')}%\n"
        f"- Active Recommendation: {rec.get('headline')}\n"
        f"- Language Context: {request.language}\n\n"
        f"Provide clear, actionable, practical farming advice in plain text. "
        f"Focus on input cost optimization, weather safety, and market timing."
    )

    user_query_text = question or f"Explain why the recommendation '{rec.get('headline')}' is best for my farm right now."

    llm_output = None
    provider_used = "Rule Engine Fallback (No Live LLM API Key Configured)"

    # Try Live Gemini API if key exists
    if gemini_key or provider_setting == "gemini":
        if gemini_key:
            llm_output = _call_gemini_api(gemini_key, system_context, user_query_text)
            if llm_output:
                provider_used = "Google Gemini 1.5 Flash (Live AI)"

    # Try Live OpenAI API if Gemini failed or OpenAI specified
    if not llm_output and (openai_key or provider_setting == "openai"):
        if openai_key:
            llm_output = _call_openai_api(openai_key, system_context, user_query_text)
            if llm_output:
                provider_used = "OpenAI GPT (Live AI)"

    # 4. If LLM provided response, process it
    if llm_output:
        action_steps = [
            f"Adhere to recommended operation window for {farmer.get('district')}",
            "Verify current field moisture and drainage before application",
            "Monitor regional APMC mandi price trends before selling produce"
        ]
        return ExplainResponse(
            explanation_text=llm_output,
            provider_used=provider_used,
            action_steps=action_steps,
            confidence=rec.get("confidence", 95),
            reasoning=rec.get("reasoning", "Live AI context synthesis")
        )

    # 5. Deterministic Context-Aware Rule Engine Fallback (When no LLM key is configured)
    base_explanation = rec.get("ai_explanation", "Analysis based on live farm memory and regional atmospheric conditions.")
    
    if question:
        q_lower = question.lower()
        if "rain" in q_lower or "weather" in q_lower or "why" in q_lower:
            added_detail = f"\n\nRegarding your question ('{question}'): Chemical rainfastness requires at least 6-8 hours without rain. Rain probabilities of {weather.get('rain_probability', 65)}% in {farmer.get('district')} will wash away active compounds, causing financial loss."
        elif "cost" in q_lower or "money" in q_lower or "save" in q_lower:
            added_detail = f"\n\nRegarding your question ('{question}'): Postponing or adjusting your schedule prevents pesticide re-purchase costs and protects your input budget on your {farmer.get('land_size_acres', 2.5)}-acre holding."
        elif "mandi" in q_lower or "price" in q_lower or "market" in q_lower or "sell" in q_lower:
            top_mandi = mandi[0] if mandi else {}
            added_detail = f"\n\nRegarding your question ('{question}'): Current APMC rates in {farmer.get('district')} for {top_mandi.get('commodity', 'crops')} are trading near ₹{top_mandi.get('modal_price', 7420)}/Qtl. Waiting for peak demand window will optimize profits."
        else:
            added_detail = f"\n\nRegarding your question ('{question}'): For {farmer.get('name')} in {farmer.get('district')}, following this advisory ensures maximum input efficiency across your {farmer.get('land_size_acres')} acre farm."
        explanation_text = base_explanation + added_detail
    else:
        explanation_text = base_explanation

    action_steps = [
        "Do not mix inputs or prep equipment prematurely to avoid chemical degradation",
        "Inspect field drainage and soil moisture conditions prior to operations",
        f"Perform recommended action during the optimal window for {farmer.get('district', 'your farm')}"
    ]

    return ExplainResponse(
        explanation_text=explanation_text,
        provider_used="Rule Engine Fallback (No Live LLM API Key Configured)",
        action_steps=action_steps,
        confidence=rec.get("confidence", 95),
        reasoning=rec.get("reasoning", "Farm context processing")
    )
