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
def get_weather(farmer_id: Optional[str] = Query(None, description="Optional farmer profile ID")):
    return weather_service.get_current_weather(farmer_id=farmer_id)
