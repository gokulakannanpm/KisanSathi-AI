import json
import logging
import os
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Known district lat/lon coordinates lookup for Indian agricultural hubs
DISTRICT_COORDINATES: Dict[str, Tuple[float, float]] = {
    "nagpur": (21.1458, 79.0882),
    "amravati": (20.9374, 77.7796),
    "nashik": (19.9975, 73.7898),
    "pune": (18.5204, 73.8567),
    "rajkot": (22.3039, 70.8022),
    "surat": (21.1702, 72.8311),
    "thanjavur": (10.7870, 79.1378),
    "coimbatore": (11.0168, 76.9558),
    "bhatinda": (30.2110, 74.9455),
    "ludhiana": (30.9010, 75.8573),
    "bhopal": (23.2599, 77.4126),
    "indore": (22.7196, 75.8577)
}


def WMO_CODE_TO_CONDITION(code: int) -> Tuple[str, bool]:
    """Maps WMO Weather Code to plain text condition and spraying_safe flag."""
    if code in (0, 1):
        return ("Clear & Sunny", True)
    elif code in (2, 3):
        return ("Partly Cloudy", True)
    elif code in (45, 48):
        return ("Foggy / Hazy", True)
    elif code in (51, 53, 55):
        return ("Light Drizzle", False)
    elif code in (61, 63, 65):
        return ("Heavy Rain & Showers", False)
    elif code in (80, 81, 82):
        return ("Heavy Rain & Thunderstorms", False)
    elif code in (95, 96, 99):
        return ("Severe Thunderstorm Warning", False)
    return ("Cloudy / Overcast", False)


class WeatherProvider:
    """Live weather integration service with Open-Meteo & OpenWeatherMap APIs and fallback."""

    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.data_dir = base_dir / "data"
        else:
            self.data_dir = Path(data_dir)

        self.mock_weather_file = self.data_dir / "mock_weather.json"

    def resolve_coordinates(self, district: Optional[str] = None, state: Optional[str] = None) -> Tuple[float, float]:
        if district:
            key = district.strip().lower()
            if key in DISTRICT_COORDINATES:
                return DISTRICT_COORDINATES[key]
        return (21.1458, 79.0882)  # Default: Nagpur, MH

    def get_fallback_weather(self, reason: str = "Live API timeout or offline", state: Optional[str] = None) -> Dict[str, Any]:
        if self.mock_weather_file.exists():
            try:
                with open(self.mock_weather_file, "r", encoding="utf-8") as f:
                    data_map = json.load(f)
                    if isinstance(data_map, dict):
                        st_key = state if state and state in data_map else "default"
                        if st_key not in data_map and "Maharashtra" in data_map:
                            st_key = "Maharashtra"
                        block = data_map.get(st_key, data_map.get("default", {}))
                        data = dict(block)
                    else:
                        data = dict(data_map)

                    data["source"] = "fallback"
                    data["source_name"] = data.get("source_name", "Deterministic State Weather (Fallback)")
                    data["fallback_reason"] = reason
                    data["fetched_at"] = datetime.utcnow().isoformat() + "Z"
                    return data
            except Exception as e:
                logger.error(f"Error loading mock_weather.json: {e}")

        return {
            "temperature": 28.4,
            "condition": "Heavy Rain & Thunderstorms",
            "rain_probability": 88,
            "humidity": 92,
            "wind_speed": 22.5,
            "pressure": 1008,
            "source": "fallback",
            "source_name": "Deterministic Demo Weather (Fallback)",
            "fallback_reason": reason,
            "fetched_at": datetime.utcnow().isoformat() + "Z",
            "forecast_3day": [
                {"day": "Tomorrow (Thu)", "condition": "Heavy Rain (45-60mm)", "rain_prob": 88, "temp_max": 27, "temp_min": 22, "spraying_safe": False},
                {"day": "Friday", "condition": "Scattered Showers", "rain_prob": 60, "temp_max": 29, "temp_min": 23, "spraying_safe": False},
                {"day": "Saturday", "condition": "Partly Cloudy / Clear", "rain_prob": 15, "temp_max": 32, "temp_min": 24, "spraying_safe": True}
            ],
            "advisory": {
                "spraying_index": "UNSAFE (Rain Washout Risk >95%)",
                "irrigation_need": "ZERO (Soil Moisture Saturated)",
                "drainage_advisory": "Ensure drainage channels clear to prevent waterlogging."
            }
        }

    def fetch_live_weather(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        provider = os.getenv("WEATHER_API_PROVIDER", "openmeteo").lower()
        api_key = os.getenv("OPENWEATHER_API_KEY")

        # 1. Try OpenWeatherMap if configured
        if provider == "openweathermap" and api_key:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={latitude}&lon={longitude}&appid={api_key}&units=metric"
                req = urllib.request.Request(url, headers={"User-Agent": "KisanSathi-AI/1.0"})
                with urllib.request.urlopen(req, timeout=5) as response:
                    res_json = json.loads(response.read().decode("utf-8"))
                    temp = float(res_json.get("main", {}).get("temp", 28.4))
                    humidity = int(res_json.get("main", {}).get("humidity", 90))
                    pressure = int(res_json.get("main", {}).get("pressure", 1008))
                    wind = float(res_json.get("wind", {}).get("speed", 5.0)) * 3.6  # m/s to km/h
                    cond_name = res_json.get("weather", [{}])[0].get("main", "Rain")

                    return {
                        "temperature": temp,
                        "condition": cond_name,
                        "rain_probability": 85 if "rain" in cond_name.lower() else 15,
                        "humidity": humidity,
                        "wind_speed": round(wind, 1),
                        "pressure": pressure,
                        "source": "live",
                        "source_name": "OpenWeatherMap Live API",
                        "fetched_at": datetime.utcnow().isoformat() + "Z",
                        "forecast_3day": [],
                        "advisory": {
                            "spraying_index": "UNSAFE (Rain Washout Risk)" if "rain" in cond_name.lower() else "SAFE",
                            "irrigation_need": "ZERO" if "rain" in cond_name.lower() else "NORMAL",
                            "drainage_advisory": "Ensure drainage channels clear."
                        }
                    }
            except Exception as e:
                logger.warning(f"OpenWeatherMap live fetch failed ({e}). Trying Open-Meteo fallback.")

        # 2. Try Open-Meteo (Free, reliable, no key needed)
        try:
            url = (
                f"https://api.open-meteo.com/v1/forecast?"
                f"latitude={latitude}&longitude={longitude}&"
                f"current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code&"
                f"daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&"
                f"timezone=auto"
            )
            req = urllib.request.Request(url, headers={"User-Agent": "KisanSathi-AI/1.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode("utf-8"))

                current = data.get("current", {})
                daily = data.get("daily", {})

                temp = float(current.get("temperature_2m", 28.4))
                humidity = int(current.get("relative_humidity_2m", 90))
                pressure = int(current.get("surface_pressure", 1008))
                wind = float(current.get("wind_speed_10m", 15.0))
                wmo_code = int(current.get("weather_code", 80))

                condition, spraying_safe = WMO_CODE_TO_CONDITION(wmo_code)
                daily_prob = daily.get("precipitation_probability_max", [88, 60, 15])
                rain_prob = daily_prob[0] if daily_prob else 88

                forecast_3day = []
                days_labels = ["Tomorrow", "Day 2", "Day 3"]
                t_max = daily.get("temperature_2m_max", [27, 29, 32])
                t_min = daily.get("temperature_2m_min", [22, 23, 24])
                codes = daily.get("weather_code", [80, 61, 1])

                for i in range(min(3, len(daily_prob))):
                    c_text, s_safe = WMO_CODE_TO_CONDITION(codes[i] if i < len(codes) else 0)
                    forecast_3day.append({
                        "day": days_labels[i],
                        "condition": c_text,
                        "rain_prob": daily_prob[i],
                        "temp_max": t_max[i] if i < len(t_max) else 30,
                        "temp_min": t_min[i] if i < len(t_min) else 22,
                        "spraying_safe": s_safe and daily_prob[i] < 40
                    })

                spraying_idx = "UNSAFE (Rain Washout Risk >80%)" if rain_prob > 50 else "SAFE (Dry Atmospheric Window)"
                irr_need = "ZERO (High Soil Moisture)" if rain_prob > 50 else "MODERATE (Irrigate Early Morning)"

                return {
                    "temperature": round(temp, 1),
                    "condition": condition,
                    "rain_probability": rain_prob,
                    "humidity": humidity,
                    "wind_speed": round(wind, 1),
                    "pressure": pressure,
                    "source": "live",
                    "source_name": "Open-Meteo Live Radar Feed",
                    "fetched_at": datetime.utcnow().isoformat() + "Z",
                    "forecast_3day": forecast_3day,
                    "advisory": {
                        "spraying_index": spraying_idx,
                        "irrigation_need": irr_need,
                        "drainage_advisory": "Ensure field drainage channels are clear of debris."
                    }
                }

        except Exception as e:
            logger.warning(f"Open-Meteo live weather fetch failed: {e}")
            return None

    def get_current_weather(
        self,
        farmer_id: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        district: Optional[str] = None,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        # If lat/lon not explicitly passed, resolve from district
        if latitude is None or longitude is None:
            latitude, longitude = self.resolve_coordinates(district=district)

        live_data = self.fetch_live_weather(latitude, longitude)
        if live_data:
            return live_data

        return self.get_fallback_weather(reason="Live weather provider unreachable; using fallback cache.", state=state)


weather_provider = WeatherProvider()
