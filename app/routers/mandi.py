import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query, Response
from app.services.mandi_service import mandi_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/mandi",
    tags=["Mandi Market Prices"]
)


@router.api_route(
    "",
    methods=["GET", "HEAD"],
    summary="Get live or fallback APMC mandi market prices"
)
@router.api_route(
    "/price",
    methods=["GET", "HEAD"],
    summary="Get live or fallback APMC mandi market prices"
)
def get_prices(
    crop: Optional[str] = Query(None, description="Filter by crop name (e.g. cotton, soybean)"),
    commodity: Optional[str] = Query(None, description="Filter by commodity name"),
    state: Optional[str] = Query(None, description="Filter by state (e.g. Maharashtra, Tamil Nadu)"),
    district: Optional[str] = Query(None, description="Filter by district (e.g. Nagpur, Thanjavur)"),
    market: Optional[str] = Query(None, description="Filter by market name (e.g. Nagpur APMC Mandi)"),
    source: Optional[str] = Query(None, description="Filter by market source: all, agmarknet, tamil_nadu, koyambedu"),
    farmer_id: Optional[str] = Query(None, description="Optional farmer ID to personalize mandi results by location and crops")
):
    crop_term = crop or commodity
    return mandi_service.get_prices(
        crop_filter=crop_term,
        state_filter=state,
        district_filter=district,
        market_filter=market,
        source_filter=source,
        farmer_id=farmer_id
    )


@router.api_route(
    "/koyambedu-benchmark",
    methods=["GET", "HEAD"],
    summary="Get official Koyambedu Wholesale Market Benchmark prices (Restricted to Thanjavur profile only)"
)
def get_koyambedu_benchmark(
    farmer_id: Optional[str] = Query("demo_farmer_03", description="Farmer ID (Must be Thanjavur, Tamil Nadu profile)"),
    commodity: Optional[str] = Query(None, description="Optional commodity filter"),
    force_refresh: bool = Query(False, description="Request manual rate-limited refresh")
):
    return mandi_service.get_koyambedu_benchmark(
        farmer_id=farmer_id,
        commodity=commodity,
        force_refresh=force_refresh
    )


@router.post(
    "/koyambedu-benchmark/refresh",
    summary="Trigger rate-limited refresh of Koyambedu Wholesale Market Benchmark (Thanjavur only)"
)
def refresh_koyambedu_benchmark(
    farmer_id: Optional[str] = Query("demo_farmer_03", description="Farmer ID (Must be Thanjavur, Tamil Nadu profile)")
):
    return mandi_service.get_koyambedu_benchmark(
        farmer_id=farmer_id,
        force_refresh=True
    )
