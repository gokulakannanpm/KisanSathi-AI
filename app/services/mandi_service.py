import logging
from typing import Any, Dict, List, Optional
from app.services.farmer_service import farmer_service
from app.services.koyambedu_service import koyambedu_service
from app.services.market_provider import market_provider

logger = logging.getLogger(__name__)


class MandiService:
    """
    Service serving live and fallback AGMARKNET, Tamil Nadu, and Koyambedu market prices.
    Strictly scopes Koyambedu wholesale market benchmark data to the Thanjavur, Tamil Nadu profile only.
    """

    def is_thanjavur_profile(
        self,
        farmer_id: Optional[str] = None,
        district: Optional[str] = None,
        state: Optional[str] = None
    ) -> bool:
        """
        Determines whether the request originates from or corresponds to the verified
        Thanjavur, Tamil Nadu farmer profile.
        """
        if farmer_id:
            try:
                profile = farmer_service.get_farmer_profile(farmer_id)
                if profile:
                    p_dist = str(profile.get("district", "")).strip().lower()
                    p_state = str(profile.get("state", "")).strip().lower()
                    if farmer_id == "demo_farmer_03" or (p_dist == "thanjavur" and "tamil nadu" in p_state):
                        return True
            except Exception as e:
                logger.debug(f"Could not load farmer profile for {farmer_id}: {e}")

        d_clean = district.strip().lower() if district else ""
        s_clean = state.strip().lower() if state else ""
        return (d_clean == "thanjavur" and "tamil nadu" in s_clean)

    def get_koyambedu_benchmark(
        self,
        farmer_id: Optional[str] = None,
        commodity: Optional[str] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Dedicated endpoint for Koyambedu benchmark prices.
        Strictly restricted to Thanjavur, Tamil Nadu profile only.
        """
        if farmer_id != "demo_farmer_03" or not self.is_thanjavur_profile(farmer_id=farmer_id):
            return {
                "eligible": False,
                "message": "Koyambedu Wholesale Market Benchmark is restricted to the Thanjavur, Tamil Nadu demo profile (demo_farmer_03) only. It is not available for registered farmers or other profiles.",
                "data": []
            }

        bundle = koyambedu_service.get_benchmark_bundle(commodity=commodity, force_refresh=force_refresh)
        return {
            "eligible": True,
            "market_name": "Koyambedu Wholesale Market Complex (KWMC), Chennai",
            "source_attribution": bundle.get("source_name", "Official MMC KWMC Portal (mmckwmc.tn.gov.in)"),
            "source_url": bundle.get("source_url", "https://mmckwmc.tn.gov.in/landing-page/commodity"),
            "benchmark_notice": "Chennai wholesale terminal benchmark for commercial reference only; not a Thanjavur local APMC farm-gate price.",
            "data_status": bundle.get("status", "live"),
            "is_live": bundle.get("is_live", True),
            "retrieved_at": bundle.get("retrieved_at", ""),
            "observation_date": bundle.get("observation_date", ""),
            "data": bundle.get("records", [])
        }

    def get_prices(
        self,
        crop_filter: Optional[str] = None,
        state_filter: Optional[str] = None,
        district_filter: Optional[str] = None,
        market_filter: Optional[str] = None,
        source_filter: Optional[str] = None,
        farmer_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        # Personalize to farmer location if provided and not explicitly overridden
        if farmer_id and not state_filter and not district_filter:
            try:
                profile = farmer_service.get_farmer_profile(farmer_id)
                if profile:
                    state_filter = profile.get("state")
                    district_filter = profile.get("district")
            except Exception as e:
                logger.debug(f"Could not load farmer profile for mandi personalization: {e}")

        is_thanjavur = self.is_thanjavur_profile(
            farmer_id=farmer_id,
            district=district_filter,
            state=state_filter
        )

        sf = source_filter.strip().lower() if source_filter else "all"

        # 1. Koyambedu source requested
        if sf == "koyambedu":
            if not is_thanjavur:
                # Strictly forbid Koyambedu for Nagpur, Rajkot, Bhatinda, etc.
                return []
            return koyambedu_service.get_benchmark_prices(commodity=crop_filter)

        # 2. General market provider query
        base_results = market_provider.get_mandi_price(
            state=state_filter,
            district=district_filter,
            market=market_filter,
            commodity=crop_filter,
            source_filter=source_filter
        )

        # 3. Guard against Koyambedu data leaking into other profiles
        if not is_thanjavur:
            cleaned = []
            for item in base_results:
                m_name = str(item.get("market", "")).lower()
                s_name = str(item.get("source_name", "")).lower()
                if "koyambedu" in m_name or "koyambedu" in s_name:
                    continue
                cleaned.append(item)
            return cleaned

        return base_results


mandi_service = MandiService()
