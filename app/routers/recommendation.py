import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Query, status
from pydantic import BaseModel, Field
from app.services.crop_planner_service import crop_planner_service
from app.services.recommendation_service import recommendation_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/recommendation",
    tags=["Personalized Recommendation Engine"]
)


class AcknowledgeRequest(BaseModel):
    action_key: Optional[str] = Field("postpone_action", description="Unique action identifier")
    status: Optional[str] = Field("postponed", description="Action status: postponed or acknowledged")
    postponed_to_date: Optional[str] = Field(None, description="Rescheduled date string")


class CropPlanRequest(BaseModel):
    state: Optional[str] = Field(None, description="Farm state override")
    district: Optional[str] = Field(None, description="Farm district override")
    land_size_acres: Optional[float] = Field(None, description="Land holding in acres")
    soil_type: Optional[str] = Field(None, description="Soil type (e.g. Black Cotton, Sandy Loam)")
    has_irrigation: Optional[bool] = Field(None, description="Whether assured irrigation is available")
    season: Optional[str] = Field(None, description="Desired sowing season: kharif, rabi")


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


@router.post(
    "/{farmer_id}/crop-plan",
    summary="On-demand crop planning assistant (only runs on explicit farmer request)"
)
def suggest_crop_plan_post(farmer_id: str, request: Optional[CropPlanRequest] = None):
    req_dict = request.model_dump() if request else {}
    return crop_planner_service.suggest_crop_plan(
        farmer_id=farmer_id,
        state=req_dict.get("state"),
        district=req_dict.get("district"),
        land_size_acres=req_dict.get("land_size_acres"),
        soil_type=req_dict.get("soil_type"),
        has_irrigation=req_dict.get("has_irrigation"),
        season_override=req_dict.get("season")
    )


@router.get(
    "/{farmer_id}/crop-plan",
    summary="On-demand crop planning assistant via GET (only runs on explicit farmer request)"
)
def suggest_crop_plan_get(
    farmer_id: str,
    season: Optional[str] = Query(None, description="Optional season: kharif, rabi")
):
    return crop_planner_service.suggest_crop_plan(
        farmer_id=farmer_id,
        season_override=season
    )
