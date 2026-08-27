import logging
from typing import Any, Dict, List, Optional
from app.services.market_provider import market_provider

logger = logging.getLogger(__name__)


class MandiService:
    """Service serving live and fallback AGMARKNET mandi market prices."""

    def get_prices(
        self,
        crop_filter: Optional[str] = None,
        state_filter: Optional[str] = None,
        district_filter: Optional[str] = None,
        market_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return market_provider.get_mandi_price(
            state=state_filter,
            district=district_filter,
            market=market_filter,
            commodity=crop_filter
        )


mandi_service = MandiService()
