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
    summary="Get live or fallback APMC mandi market prices"
)
def get_prices(
    crop: Optional[str] = Query(None, description="Filter by crop name (e.g. cotton, soybean)"),
    commodity: Optional[str] = Query(None, description="Filter by commodity name"),
    state: Optional[str] = Query(None, description="Filter by state (e.g. Maharashtra)"),
    district: Optional[str] = Query(None, description="Filter by district (e.g. Nagpur)"),
    market: Optional[str] = Query(None, description="Filter by market name (e.g. Nagpur APMC)")
):
    crop_term = crop or commodity
    return mandi_service.get_prices(
        crop_filter=crop_term,
        state_filter=state,
        district_filter=district,
        market_filter=market
    )
