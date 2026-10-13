import logging
from typing import Any, Dict, List, Optional
from app.services.farmer_service import farmer_service
from app.services.market_provider import market_provider

logger = logging.getLogger(__name__)


class MandiService:
    """Service serving live and fallback AGMARKNET, Tamil Nadu, and Koyambedu market prices."""

    def get_prices(
        self,
        crop_filter: Optional[str] = None,
        state_filter: Optional[str] = None,
        district_filter: Optional[str] = None,
        market_filter: Optional[str] = None,
        source_filter: Optional[str] = None,
        farmer_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        # If farmer_id provided and state/crop not explicitly provided, personalize to farmer's location/crops
        if farmer_id and not state_filter and not district_filter:
            try:
                profile = farmer_service.get_farmer_profile(farmer_id)
                if profile:
                    state_filter = profile.get("state")
                    district_filter = profile.get("district")
                    if not crop_filter and profile.get("crops"):
                        # If no crop filter provided, we let it fetch the farmer's state/district mandi prices
                        pass
            except Exception as e:
                logger.debug(f"Could not load farmer profile for mandi personalization: {e}")

        return market_provider.get_mandi_price(
            state=state_filter,
            district=district_filter,
            market=market_filter,
            commodity=crop_filter,
            source_filter=source_filter
        )


mandi_service = MandiService()
