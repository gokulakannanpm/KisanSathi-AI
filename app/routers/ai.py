import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.ai_provider import ai_provider
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
    except Exception as e:
        logger.warning(f"Failed to fetch context for {farmer_id}: {e}")
        farmer = {"name": "Farmer", "district": "District", "land_size_acres": 2.5, "crops": ["cotton"]}
        rec = {"action": "POSTPONE SPRAYING", "reasoning": "Rain washout risk", "confidence": 95}

    farmer_name = farmer.get("name", "Farmer")
    district = farmer.get("district", "District")
    crops_list = farmer.get("crops", ["crop"])
    crop = crops_list[0] if isinstance(crops_list, list) and crops_list else "crop"
    land_acres = farmer.get("land_size_acres", 2.5)

    res = ai_provider.generate_explanation(
        farmer_name=farmer_name,
        district=district,
        crop=crop,
        land_acres=land_acres,
        recommendation_action=rec.get("headline", rec.get("action", "Advisory Action")),
        reasoning=rec.get("reasoning", "Farm context evaluation"),
        user_question=request.question,
        context=request.context or rec
    )

    return ExplainResponse(
        explanation_text=res["explanation_text"],
        provider_used=res["provider_used"],
        action_steps=res["action_steps"],
        confidence=res.get("confidence", rec.get("confidence", 95)),
        reasoning=res.get("reasoning", rec.get("reasoning"))
    )
