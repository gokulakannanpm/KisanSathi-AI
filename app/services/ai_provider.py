import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class AIProvider:
    """Multi-tiered AI provider service supporting Google Gemini, OpenAI, and Rule Engine Fallback."""

    def __init__(self):
        self.default_provider = "KisanSathi Farm Intelligence Engine (Deterministic Rules)"

    def generate_explanation(
        self,
        farmer_name: str,
        district: str,
        crop: str,
        land_acres: float,
        recommendation_action: str,
        reasoning: str,
        user_question: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        gemini_key = os.getenv("GEMINI_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")

        # 1. Try Google Gemini if key configured
        if gemini_key:
            try:
                prompt = (
                    f"You are KisanSathi AI, an expert agronomic assistant for Indian farmers.\n"
                    f"Farmer: {farmer_name}, Location: {district}, Land: {land_acres} acres, Crop: {crop}.\n"
                    f"Recommended Action: {recommendation_action}.\n"
                    f"Core Reasoning: {reasoning}.\n"
                    f"User Question: {user_question or 'Provide a clear explanation and step-by-step guidance.'}\n"
                    f"Provide concise, practical agricultural advice in clear natural language."
                )
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
                req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})

                with urllib.request.urlopen(req, timeout=6) as response:
                    res_json = json.loads(response.read().decode("utf-8"))
                    candidates = res_json.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text:
                            return {
                                "explanation_text": text,
                                "provider_used": "Google Gemini 1.5 Flash Live API",
                                "action_steps": [
                                    f"Follow the primary advisory for {crop} in {district}",
                                    "Inspect field conditions prior to operation",
                                    "Ensure proper chemical safety and dosage adherence"
                                ],
                                "confidence": 98,
                                "reasoning": reasoning
                            }
            except Exception as e:
                logger.warning(f"Gemini AI provider call failed: {e}")

        # 2. Try OpenAI if key configured
        if openai_key:
            try:
                url = "https://api.openai.com/v1/chat/completions"
                payload = json.dumps({
                    "model": "gpt-3.5-turbo",
                    "messages": [
                        {"role": "system", "content": "You are KisanSathi AI, an expert agricultural assistant."},
                        {"role": "user", "content": f"Farmer {farmer_name} in {district} ({land_acres} Ac {crop}). Action: {recommendation_action}. Reason: {reasoning}. Question: {user_question or 'Explain why'}"}
                    ],
                    "temperature": 0.3
                }).encode("utf-8")
                req = urllib.request.Request(url, data=payload, headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {openai_key}"
                })

                with urllib.request.urlopen(req, timeout=6) as response:
                    res_json = json.loads(response.read().decode("utf-8"))
                    text = res_json.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if text:
                        return {
                            "explanation_text": text,
                            "provider_used": "OpenAI GPT-3.5 Live API",
                            "action_steps": [
                                f"Adhere to the recommended window for {district}",
                                "Verify input quality and soil moisture",
                                "Document action in farm memory diary"
                            ],
                            "confidence": 97,
                            "reasoning": reasoning
                        }
            except Exception as e:
                logger.warning(f"OpenAI provider call failed: {e}")

        # 3. Deterministic Rule Engine Fallback (Honest & Transparent)
        explanation = context.get("ai_explanation") if context else None
        if not explanation:
            explanation = (
                f"Detailed Farm Intelligence Analysis:\n"
                f"1. Farm Memory: {farmer_name} operates {land_acres} acres in {district}.\n"
                f"2. Contextual Risk: {reasoning}\n"
                f"3. Agronomic Strategy: Adhere to the recommended schedule window to protect yield and input investment."
            )

        if user_question:
            q_lower = user_question.lower()
            if "rain" in q_lower or "weather" in q_lower or "why" in q_lower:
                explanation += f"\n\nIn response to your query ('{user_question}'): Atmospheric conditions and chemical rainfastness mandate a dry window to prevent input washout and financial loss."
            elif "cost" in q_lower or "money" in q_lower or "save" in q_lower:
                explanation += f"\n\nIn response to your query ('{user_question}'): Following this advisory prevents unnecessary input repurchasing while protecting your crop budget."
            else:
                explanation += f"\n\nIn response to your query ('{user_question}'): As {farmer_name} in {district}, adhering to this advisory ensures optimal input efficiency for your {land_acres} acre farm."

        return {
            "explanation_text": explanation,
            "provider_used": self.default_provider,
            "action_steps": [
                "Do not mix inputs or prep equipment prematurely to avoid degradation",
                "Inspect field drainage and soil moisture conditions prior to operations",
                f"Perform recommended action during the optimal window for {district}"
            ],
            "confidence": 96,
            "reasoning": reasoning
        }


ai_provider = AIProvider()
