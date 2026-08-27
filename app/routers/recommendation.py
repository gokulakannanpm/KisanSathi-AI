import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, status
from pydantic import BaseModel, Field
from app.services.recommendation_service import recommendation_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/recommendation",
    tags=["Personalized Recommendation Engine"]
)


class AcknowledgeRequest(BaseModel):
    action_key: Optional[str] = Field("postpone_action", description="Unique action identifier")
    status: Optional[str] = Field("postponed", description="Action status: postponed or acknowledged")
    postponed_to_date: Optional[str] = Field("Saturday, 29 August 2026", description="Rescheduled date string")


class RecommendationResponse(BaseModel):
    decision_type: str = Field(..., description="Decision type")
    action: str = Field(..., description="Actionable summary banner title")
    headline: str = Field(..., description="Detailed headline with emoji")
    reasoning: str = Field(..., description="Plain-language explanation linking diary and weather")
    ai_explanation: str = Field(..., description="Detailed step-by-step intelligence breakdown")
    confidence: int = Field(..., description="Confidence score percentage (0-100)")
    estimated_impact: str = Field(..., description="Estimated economic/agronomic benefit")
    underlying_context: Dict[str, Any] = Field(..., description="Context parameters used in recommendation")
    recommended_new_date: Optional[str] = Field(None, description="Suggested rescheduled date if applicable")
    source_data: Optional[Dict[str, Any]] = Field(None, description="Raw source parameters")
    is_acknowledged: Optional[bool] = Field(False, description="Whether action is persisted as acknowledged/postponed")
    acknowledged_status: Optional[str] = Field(None, description="Acknowledged status string")
    status_label: Optional[str] = Field(None, description="Formatted status label")


@router.get(
    "/{farmer_id}",
    response_model=RecommendationResponse,
    summary="Get personalized recommendation synthesizing farmer diary, weather, and mandi prices"
)
def get_recommendation(farmer_id: str):
    return recommendation_service.get_recommendation(farmer_id)


@router.post(
    "/{farmer_id}/acknowledge",
    summary="Persist farmer action acknowledgement or postponement to SQLite"
)
def acknowledge_recommendation(farmer_id: str, request: AcknowledgeRequest):
    return recommendation_service.acknowledge_action(
        farmer_id=farmer_id,
        action_key=request.action_key or "postpone_action",
        status_str=request.status or "postponed",
        postponed_to_date=request.postponed_to_date
    )
