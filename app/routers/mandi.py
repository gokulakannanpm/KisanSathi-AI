import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from app.services.mandi_service import mandi_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/mandi",
    tags=["Mandi Market Prices"]
)


@router.get(
    "/price",
    summary="Get live or benchmark APMC mandi market prices"
)
def get_prices(
    crop: Optional[str] = Query(None, description="Filter by crop name (e.g. cotton, soybean)"),
    state: Optional[str] = Query(None, description="Filter by state (e.g. Maharashtra)")
):
    return mandi_service.get_prices(crop_filter=crop, state_filter=state)
