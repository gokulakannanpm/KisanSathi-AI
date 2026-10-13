import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Query
from app.services.weather_service import weather_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/weather",
    tags=["Live Weather & Advisory"]
)


@router.get(
    "/current",
    summary="Get current live weather forecast and agricultural advisory"
)
def get_current_weather_endpoint(
    farmer_id: Optional[str] = Query(None, description="Optional farmer profile ID"),
    district: Optional[str] = Query(None, description="Optional district name (e.g. Thanjavur, Rajkot)"),
    state: Optional[str] = Query(None, description="Optional state name (e.g. Tamil Nadu, Gujarat)"),
    lat: Optional[float] = Query(None, description="Optional latitude coordinate"),
    lon: Optional[float] = Query(None, description="Optional longitude coordinate")
):
    return weather_service.get_current_weather(
        farmer_id=farmer_id,
        latitude=lat,
        longitude=lon,
        district=district,
        state=state
    )


@router.get(
    "/current/{farmer_id}",
    summary="Get current live weather forecast by farmer ID"
)
@router.get(
    "/{farmer_id}",
    summary="Get current live weather forecast by farmer ID"
)
def get_weather_by_farmer_id(
    farmer_id: str,
    district: Optional[str] = Query(None, description="Optional district name (e.g. Thanjavur, Rajkot)"),
    state: Optional[str] = Query(None, description="Optional state name (e.g. Tamil Nadu, Gujarat)"),
    lat: Optional[float] = Query(None, description="Optional latitude coordinate"),
    lon: Optional[float] = Query(None, description="Optional longitude coordinate")
):
    return weather_service.get_current_weather(
        farmer_id=farmer_id,
        latitude=lat,
        longitude=lon,
        district=district,
        state=state
    )
