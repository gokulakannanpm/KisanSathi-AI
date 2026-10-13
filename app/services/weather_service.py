import logging
from typing import Any, Dict, Optional
from app.services.farmer_service import farmer_service
from app.services.weather_provider import weather_provider

logger = logging.getLogger(__name__)


class WeatherService:
    """Service serving live and deterministic weather data."""

    def get_current_weather(
        self,
        farmer_id: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        district: Optional[str] = None,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        crops = None
        if farmer_id:
            try:
                profile = farmer_service.get_farmer_profile(farmer_id)
                if not district:
                    district = profile.get("district")
                if not state:
                    state = profile.get("state")
                crops = profile.get("crops")
            except Exception as e:
                logger.debug(f"Could not load farmer profile for {farmer_id}: {e}")

        return weather_provider.get_current_weather(
            farmer_id=farmer_id,
            latitude=latitude,
            longitude=longitude,
            district=district,
            state=state,
            farmer_crops=crops
        )


weather_service = WeatherService()
