import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class WeatherService:
    """Service serving live and deterministic mock weather data."""

    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.data_dir = base_dir / "data"
        else:
            self.data_dir = Path(data_dir)

        self.mock_weather_file = self.data_dir / "mock_weather.json"

    def get_current_weather(self, farmer_id: Optional[str] = None) -> Dict[str, Any]:
        if self.mock_weather_file.exists():
            try:
                with open(self.mock_weather_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading mock_weather.json: {e}")

        # Fallback inline default
        return {
            "temperature": 28.4,
            "condition": "Heavy Rain & Thunderstorms",
            "rain_probability": 88,
            "humidity": 92,
            "wind_speed": 22.5,
            "pressure": 1008,
            "source": "mock",
            "source_name": "Deterministic Demo Weather (No API)",
            "forecast_3day": [],
            "advisory": {
                "spraying_index": "UNSAFE (Rain Washout Risk >95%)",
                "irrigation_need": "ZERO (Soil Moisture Saturated)",
                "drainage_advisory": "Ensure drainage channels clear to prevent waterlogging."
            }
        }


weather_service = WeatherService()
