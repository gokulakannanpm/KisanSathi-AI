import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.farmer_service import farmer_service
from app.services.recommendation_service import recommendation_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/ai",
    tags=["AI Explainer Assistant"]
)


class ExplainRequest(BaseModel):
    farmer_id: Optional[str] = Field("demo_farmer_01", description="Farmer ID for context retrieval")
    question: Optional[str] = Field(None, description="User follow-up question if any")
    context: Optional[Dict[str, Any]] = Field(None, description="Optional additional context payload")


class ExplainResponse(BaseModel):
    explanation_text: str = Field(..., description="Detailed markdown/text explanation of farm decision")
    provider_used: str = Field(..., description="AI model or rule engine identifier")
    action_steps: List[str] = Field(default_factory=list, description="Step-by-step actionable advice")
    confidence: int = Field(95, description="Confidence percentage")
    reasoning: Optional[str] = Field(None, description="High-level reasoning summary")


@router.post(
    "/explain",
    response_model=ExplainResponse,
    summary="Get detailed AI explanation for recommendations and advisories"
)
def explain_recommendation(request: ExplainRequest):
    farmer_id = request.farmer_id or "demo_farmer_01"

    try:
        farmer = farmer_service.get_farmer_profile(farmer_id)
        rec = recommendation_service.get_recommendation(farmer_id)
        explanation_text = rec.get("ai_explanation", "")
        reasoning = rec.get("reasoning", "")
        confidence = rec.get("confidence", 95)
    except Exception as e:
        logger.warning(f"Failed to fetch context for {farmer_id}: {e}")
        explanation_text = "Analysis based on live farm memory and regional atmospheric conditions."
        reasoning = "Farm context processing"
        confidence = 95
        farmer = {"name": "Farmer", "district": "District", "land_size_acres": 2.5}

    # Custom answer if user asked a question in the modal chat
    if request.question:
        q_lower = request.question.lower()
        if "rain" in q_lower or "weather" in q_lower or "why" in q_lower:
            explanation_text += f"\n\nIn response to your query ('{request.question}'): Chemical rainfastness requires at least 6-8 hours without rain. Applying active compounds prior to a severe rain event results in chemical runoff into local drainage channels, zero efficacy against target pests, and unnecessary financial loss."
        elif "cost" in q_lower or "money" in q_lower or "save" in q_lower:
            explanation_text += f"\n\nIn response to your query ('{request.question}'): By postponing or adjusting your schedule, you prevent chemical re-purchase costs and protect your input budget while maintaining crop health."
        else:
            explanation_text += f"\n\nIn response to your query ('{request.question}'): As {farmer.get('name', 'the farmer')} in {farmer.get('district', 'your region')}, adhering to this advisory ensures maximum input efficiency across your {farmer.get('land_size_acres', 2.5)} acre holding."

    action_steps = [
        "Do not mix inputs or prep equipment prematurely to avoid degradation",
        "Inspect field drainage and soil moisture conditions prior to operations",
        f"Perform recommended action during the optimal window for {farmer.get('district', 'your farm')}"
    ]

    return ExplainResponse(
        explanation_text=explanation_text,
        provider_used="KisanSathi Farm Intelligence Engine (Deterministic Rules)",
        action_steps=action_steps,
        confidence=confidence,
        reasoning=reasoning
    )
