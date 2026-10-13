import json
import logging
import os
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Comprehensive Indian agricultural district lat/lon coordinates
DISTRICT_COORDINATES: Dict[str, Tuple[float, float]] = {
    # Maharashtra
    "nagpur": (21.1458, 79.0882),
    "amravati": (20.9374, 77.7796),
    "nashik": (19.9975, 73.7898),
    "pune": (18.5204, 73.8567),
    "aurangabad": (19.8762, 75.3433),
    "chhatrapati sambhajinagar": (19.8762, 75.3433),
    "yavatmal": (20.3888, 78.1204),
    "wardha": (20.7453, 78.6022),
    "akola": (20.7002, 77.0082),
    "solapur": (17.6599, 75.9064),
    "kolhapur": (16.7050, 74.2433),
    "jalgaon": (21.0077, 75.5626),
    "nanded": (19.1383, 77.3210),
    "buldhana": (20.5293, 76.1834),
    "latur": (18.4088, 76.5604),
    "satara": (17.6805, 74.0183),
    "sangli": (16.8524, 74.5815),
    "chandrapur": (19.9615, 79.2961),

    # Gujarat
    "rajkot": (22.3039, 70.8022),
    "surat": (21.1702, 72.8311),
    "ahmedabad": (23.0225, 72.5714),
    "junagadh": (21.5222, 70.4579),
    "vadodara": (22.3072, 73.1812),
    "bhavnagar": (21.7645, 72.1519),
    "jamnagar": (22.4707, 70.0577),
    "amreli": (21.6032, 71.2221),
    "mehsana": (23.5880, 72.3693),
    "anand": (22.5645, 72.9289),
    "kheda": (22.7533, 72.6838),
    "patan": (23.8493, 72.1266),
    "sabarkantha": (23.6841, 73.0442),

    # Tamil Nadu
    "thanjavur": (10.7870, 79.1378),
    "coimbatore": (11.0168, 76.9558),
    "madurai": (9.9252, 78.1198),
    "salem": (11.6643, 78.1460),
    "tiruchirappalli": (10.7905, 78.7047),
    "trichy": (10.7905, 78.7047),
    "chennai": (13.0827, 80.2707),
    "tirunelveli": (8.7139, 77.7567),
    "erode": (11.3410, 77.7172),
    "vellore": (12.9165, 79.1325),
    "thiruvarur": (10.7725, 79.6365),
    "nagapattinam": (10.7672, 79.8449),
    "cuddalore": (11.7480, 79.7714),
    "villupuram": (11.9401, 79.4861),
    "dindigul": (10.3673, 77.9803),
    "dharmapuri": (12.1211, 78.1582),

    # Punjab
    "bhatinda": (30.2110, 74.9455),
    "bathinda": (30.2110, 74.9455),
    "ludhiana": (30.9010, 75.8573),
    "patiala": (30.3398, 76.3869),
    "amritsar": (31.6340, 74.8723),
    "jalandhar": (31.3260, 75.5762),
    "sangrur": (30.2458, 75.8421),
    "firozpur": (30.9237, 74.6138),
    "moga": (30.8165, 75.1717),
    "mansa": (29.9880, 75.3853),
    "kapurthala": (31.3802, 75.3814),
    "hoshiarpur": (31.5273, 75.9149),

    # Madhya Pradesh
    "bhopal": (23.2599, 77.4126),
    "indore": (22.7196, 75.8577),
    "ujjain": (23.1765, 75.7885),
    "jabalpur": (23.1815, 79.9864),
    "gwalior": (26.2183, 78.1828),
    "sagar": (23.8388, 78.7378),
    "dewas": (22.9676, 76.0534),
    "khargone": (21.8252, 75.6120),

    # Karnataka
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "mysuru": (12.2958, 76.6394),
    "belagavi": (15.8497, 74.4977),
    "dharwad": (15.4589, 75.0078),
    "hubballi": (15.3647, 75.1240),
    "ballari": (15.1394, 76.9214),
    "raichur": (16.2120, 77.3439),

    # Andhra Pradesh & Telangana
    "guntur": (16.3067, 80.4365),
    "vijayawada": (16.5062, 80.6480),
    "kurnool": (15.8281, 78.0373),
    "hyderabad": (17.3850, 78.4867),
    "warangal": (17.9689, 79.5941),
    "karimnagar": (18.4386, 79.1288),

    # Uttar Pradesh
    "lucknow": (26.8467, 80.9462),
    "kanpur": (26.4499, 80.3319),
    "varanasi": (25.3176, 82.9739),
    "agra": (27.1767, 78.0081),
    "meerut": (28.9845, 77.7064),

    # Rajasthan & Haryana
    "jaipur": (26.9124, 75.7873),
    "jodhpur": (26.2389, 73.0243),
    "kota": (25.2138, 75.8648),
    "karnal": (29.6857, 76.9905),
    "hisar": (29.1492, 75.7217)
}

# State centroid fallback coordinates when district is not individually mapped
STATE_COORDINATES: Dict[str, Tuple[float, float]] = {
    "maharashtra": (19.7515, 75.7139),
    "gujarat": (22.2587, 71.1924),
    "tamil nadu": (10.8505, 78.7047),
    "punjab": (31.1471, 75.3412),
    "karnataka": (15.3173, 75.7139),
    "andhra pradesh": (15.9129, 79.7400),
    "telangana": (18.1124, 79.0193),
    "madhya pradesh": (22.9734, 78.6569),
    "rajasthan": (27.0238, 74.2179),
    "haryana": (29.0588, 76.0856),
    "uttar pradesh": (26.8467, 80.9462),
    "bihar": (25.0961, 85.3131),
    "west bengal": (22.9868, 87.8550)
}


def WMO_CODE_TO_CONDITION(code: int) -> Tuple[str, bool]:
    """Maps WMO Weather Code to accurate condition description and spraying_safe flag."""
    if code in (0, 1):
        return ("Clear & Sunny", True)
    elif code in (2, 3):
        return ("Partly Cloudy", True)
    elif code in (45, 48):
        return ("Foggy / Hazy", True)
    elif code in (51, 53, 55):
        return ("Light Drizzle", False)
    elif code in (56, 57):
        return ("Freezing Drizzle", False)
    elif code in (61, 63, 65):
        return ("Rain Showers", False)
    elif code in (66, 67):
        return ("Freezing Rain", False)
    elif code in (71, 73, 75, 77):
        return ("Snow Showers", False)
    elif code in (80, 81, 82):
        return ("Heavy Rain Showers", False)
    elif code in (95, 96, 99):
        return ("Thunderstorm Warning", False)
    return ("Cloudy / Overcast", False)


class WeatherProvider:
    """Live weather integration service with Open-Meteo API and safe deterministic fallback."""

    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.data_dir = base_dir / "data"
        else:
            self.data_dir = Path(data_dir)

        self.mock_weather_file = self.data_dir / "mock_weather.json"

    def resolve_coordinates(
        self,
        district: Optional[str] = None,
        state: Optional[str] = None
    ) -> Tuple[Optional[float], Optional[float], str]:
        """
        Resolves weather coordinates accurately from actual district and state.
        Never defaults to Nagpur if farmer belongs to another district or state.
        Returns (latitude, longitude, resolved_location_label).
        If location cannot be resolved, returns (None, None, 'Location Unresolved').
        """
        d_clean = district.strip().lower() if district else ""
        s_clean = state.strip().lower() if state else ""

        # 1. District match
        if d_clean and d_clean in DISTRICT_COORDINATES:
            lat, lon = DISTRICT_COORDINATES[d_clean]
            label = f"{district.strip().title()}, {state.strip().title() if state else 'India'}"
            return lat, lon, label

        # 2. State centroid match (clearly labeled as regional fallback, not specific district)
        if s_clean and s_clean in STATE_COORDINATES:
            lat, lon = STATE_COORDINATES[s_clean]
            if d_clean:
                label = f"{district.strip().title()} (Regional), {state.strip().title()}"
            else:
                label = f"Regional, {state.strip().title()}"
            return lat, lon, label

        # 3. Unresolved location
        return None, None, "Location Unresolved"

    def generate_actionable_advice(
        self,
        weather: Dict[str, Any],
        farmer_crops: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates dynamic, actionable agronomic advice based on actual weather conditions
        (rain probability, temperature, wind speed, humidity, 3-day forecast) and farmer's crops.
        """
        advice_list: List[Dict[str, Any]] = []
        rain_prob = weather.get("rain_probability")
        if rain_prob is None:
            rain_prob = weather.get("precipitation_probability", 0) or 0

        temp = weather.get("temperature", 28.0) or 28.0
        wind = weather.get("wind_speed")
        if wind is None:
            wind = weather.get("wind_speed_kmh", 10.0) or 10.0
        humidity = weather.get("humidity", 60) or 60
        primary_crop = farmer_crops[0].title() if farmer_crops and len(farmer_crops) > 0 else "Crop"

        # 1. Irrigation Advice
        if rain_prob >= 40:
            advice_list.append({
                "id": "adv_irrigation_delay",
                "action": f"Delay irrigation on your {primary_crop} fields",
                "reason": f"{rain_prob}% rain probability forecasted. Natural precipitation will replenish root zone soil moisture without pumping energy costs.",
                "crop": primary_crop,
                "urgency": "High",
                "time_period": "Next 24 to 48 hours",
                "weather_context": f"Rain Probability: {rain_prob}%, Humidity: {humidity}%",
                "can_add_to_diary": True
            })
        elif rain_prob < 20 and temp >= 32:
            advice_list.append({
                "id": "adv_irrigation_schedule",
                "action": f"Schedule early morning irrigation for {primary_crop}",
                "reason": f"High temperatures ({temp}°C) and low rain risk ({rain_prob}%). Early morning irrigation (06:00 - 08:30 AM) prevents rapid evapotranspiration loss.",
                "crop": primary_crop,
                "urgency": "Medium",
                "time_period": "Early Morning (06:00 - 08:30 AM)",
                "weather_context": f"Temp: {temp}°C, Rain Probability: {rain_prob}%",
                "can_add_to_diary": True
            })

        # 2. Drainage / Waterlogging Prevention Advice
        if rain_prob >= 55:
            advice_list.append({
                "id": "adv_drainage_prep",
                "action": "Clear perimeter drainage trenches & furrows",
                "reason": f"Substantial rainfall risk ({rain_prob}%) indicated. Unclogging drainage ditches prevents standing water and root asphyxiation.",
                "crop": primary_crop,
                "urgency": "High",
                "time_period": "Today before rains begin",
                "weather_context": f"Rain Risk: {rain_prob}%",
                "can_add_to_diary": True
            })

        # 3. Chemical Spraying / Plant Protection Advice (Adheres to product label guidance)
        if rain_prob >= 35 or wind >= 18.0:
            reasons = []
            if rain_prob >= 35:
                reasons.append(f"rain risk ({rain_prob}%) risks active ingredient wash-off")
            if wind >= 18.0:
                reasons.append(f"elevated wind velocity ({wind} km/h) causes off-target drift")

            advice_list.append({
                "id": "adv_spraying_postpone",
                "action": "Postpone foliar spray operations",
                "reason": f"Weather conditions unfavorable: {', '.join(reasons)}. Chemical rainfastness varies by product; check the container label and delay until dry, calm weather.",
                "crop": primary_crop,
                "urgency": "High",
                "time_period": "Until clear dry window",
                "weather_context": f"Wind: {wind} km/h, Rain Prob: {rain_prob}%",
                "can_add_to_diary": True
            })
        else:
            advice_list.append({
                "id": "adv_spraying_favorable",
                "action": f"Favorable spraying window for {primary_crop}",
                "reason": f"Calm wind velocity ({wind} km/h) and minimal rain risk ({rain_prob}%). Follow product label safety and dosage instructions.",
                "crop": primary_crop,
                "urgency": "Advisory",
                "time_period": "Morning or Late Afternoon",
                "weather_context": f"Wind: {wind} km/h, Rain Prob: {rain_prob}%",
                "can_add_to_diary": True
            })

        # 4. Humidity & Pest / Disease Alert
        if humidity >= 80 and temp >= 26.0:
            advice_list.append({
                "id": "adv_pest_scout",
                "action": f"Scout {primary_crop} canopy for fungal signs",
                "reason": f"High relative humidity ({humidity}%) and warm temperatures ({temp}°C) create a conducive microclimate for fungal pathogens.",
                "crop": primary_crop,
                "urgency": "Medium",
                "time_period": "Next 2 days",
                "weather_context": f"Humidity: {humidity}%, Temp: {temp}°C",
                "can_add_to_diary": True
            })

        return advice_list

    def get_fallback_weather(
        self,
        reason: str = "Live API timeout or offline",
        state: Optional[str] = None,
        resolved_label: str = "Regional Baseline"
    ) -> Dict[str, Any]:
        """Provides state-aware fallback weather cache with dynamic forecast dates."""
        temp = 28.4
        condition = "Partly Cloudy"
        rain_prob = 25
        humidity = 68
        wind_speed = 12.0
        pressure = 1010

        s_lower = state.lower() if state else ""
        if "tamil nadu" in s_lower:
            temp = 31.2
            condition = "Warm & Humid"
            humidity = 78
            rain_prob = 30
            wind_speed = 14.0
        elif "punjab" in s_lower:
            temp = 29.0
            condition = "Clear"
            humidity = 55
            rain_prob = 10
            wind_speed = 9.0
        elif "gujarat" in s_lower:
            temp = 32.5
            condition = "Sunny & Dry"
            humidity = 58
            rain_prob = 15
            wind_speed = 11.0
        elif "maharashtra" in s_lower:
            temp = 28.5
            condition = "Partly Cloudy"
            humidity = 70
            rain_prob = 25
            wind_speed = 12.0

        now = datetime.now(timezone.utc)
        forecast_3day = []
        for i in range(1, 4):
            day_target = now + timedelta(days=i)
            if i == 1:
                d_label = f"Tomorrow ({day_target.strftime('%a')})"
            else:
                d_label = f"{day_target.strftime('%A')} ({day_target.strftime('%d %b')})"

            prob_i = max(5, rain_prob - (i * 5))
            c_text = condition if i == 1 else ("Partly Cloudy" if i == 2 else "Clear & Sunny")
            forecast_3day.append({
                "day": d_label,
                "date": day_target.strftime("%Y-%m-%d"),
                "condition": c_text,
                "rain_prob": prob_i,
                "precipitation_mm": 0.0,
                "temp_max": int(temp + i + 1),
                "temp_min": int(temp - 3),
                "spraying_safe": prob_i < 35
            })

        spraying_idx = "SAFE (Dry Atmospheric Window)" if rain_prob < 35 else "CAUTION (Monitor Local Rain Risk)"
        irr_need = "NORMAL (Schedule per crop growth stage)"

        return {
            "temperature": round(temp, 1),
            "condition": condition,
            "rain_probability": rain_prob,
            "precipitation_probability": rain_prob,
            "precipitation_mm": 0.0,
            "humidity": humidity,
            "wind_speed": wind_speed,
            "wind_speed_kmh": wind_speed,
            "pressure": pressure,
            "source": "fallback",
            "source_name": "Regional Historical Weather Baseline",
            "fallback_reason": reason,
            "resolved_location": resolved_label,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "forecast_3day": forecast_3day,
            "advisory": {
                "spraying_index": spraying_idx,
                "irrigation_need": irr_need,
                "drainage_advisory": "Keep field drainage channels clear of weeds and silt."
            }
        }

    def fetch_live_weather(
        self,
        latitude: float,
        longitude: float,
        resolved_label: str
    ) -> Optional[Dict[str, Any]]:
        """Fetches live weather from Open-Meteo with accurate parameters and UTC timestamps."""
        try:
            url = (
                f"https://api.open-meteo.com/v1/forecast?"
                f"latitude={latitude}&longitude={longitude}&"
                f"current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code&"
                f"daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&"
                f"timezone=auto"
            )
            req = urllib.request.Request(url, headers={"User-Agent": "KisanSathi-AI/1.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode("utf-8"))

                current = data.get("current", {})
                daily = data.get("daily", {})

                temp = float(current.get("temperature_2m", 28.0))
                humidity = int(current.get("relative_humidity_2m", 65))
                pressure = int(current.get("surface_pressure", 1010))
                wind = float(current.get("wind_speed_10m", 10.0))
                wmo_code = int(current.get("weather_code", 0))

                condition, _ = WMO_CODE_TO_CONDITION(wmo_code)

                daily_prob = daily.get("precipitation_probability_max", [])
                daily_sum = daily.get("precipitation_sum", [])
                daily_times = daily.get("time", [])
                t_max_arr = daily.get("temperature_2m_max", [])
                t_min_arr = daily.get("temperature_2m_min", [])
                codes_arr = daily.get("weather_code", [])

                # Daily index 0 is today; next indices (1, 2, 3) are tomorrow, day 2, day 3
                rain_prob = int(daily_prob[0]) if len(daily_prob) > 0 and daily_prob[0] is not None else 0
                precip_mm = float(daily_sum[0]) if len(daily_sum) > 0 and daily_sum[0] is not None else 0.0

                now = datetime.now(timezone.utc)
                forecast_3day = []
                for offset in range(1, 4):
                    idx = offset if len(daily_prob) > offset else (len(daily_prob) - 1 if len(daily_prob) > 0 else 0)
                    day_target = now + timedelta(days=offset)

                    if offset == 1:
                        day_label = f"Tomorrow ({day_target.strftime('%a')})"
                    else:
                        day_label = f"{day_target.strftime('%A')} ({day_target.strftime('%d %b')})"

                    date_str = daily_times[idx] if idx < len(daily_times) else day_target.strftime("%Y-%m-%d")
                    prob_val = int(daily_prob[idx]) if idx < len(daily_prob) and daily_prob[idx] is not None else 10
                    p_sum_val = float(daily_sum[idx]) if idx < len(daily_sum) and daily_sum[idx] is not None else 0.0
                    code_val = int(codes_arr[idx]) if idx < len(codes_arr) and codes_arr[idx] is not None else 0
                    c_text, s_safe = WMO_CODE_TO_CONDITION(code_val)
                    t_max = int(t_max_arr[idx]) if idx < len(t_max_arr) and t_max_arr[idx] is not None else int(temp + 2)
                    t_min = int(t_min_arr[idx]) if idx < len(t_min_arr) and t_min_arr[idx] is not None else int(temp - 4)

                    forecast_3day.append({
                        "day": day_label,
                        "date": date_str,
                        "condition": c_text,
                        "rain_prob": prob_val,
                        "precipitation_mm": round(p_sum_val, 1),
                        "temp_max": t_max,
                        "temp_min": t_min,
                        "spraying_safe": s_safe and prob_val < 35
                    })

                spraying_idx = "UNSAFE (Rain Risk >50%)" if rain_prob > 50 else (
                    "CAUTION (Elevated Rain Risk)" if rain_prob >= 35 else "SAFE (Dry Atmospheric Window)"
                )
                irr_need = "ZERO (High Rain Probability)" if rain_prob > 50 else (
                    "LOW (Adequate Moisture)" if rain_prob >= 30 else "NORMAL (Morning / Evening Cycle)"
                )

                return {
                    "temperature": round(temp, 1),
                    "condition": condition,
                    "rain_probability": rain_prob,
                    "precipitation_probability": rain_prob,
                    "precipitation_mm": round(precip_mm, 1),
                    "humidity": humidity,
                    "wind_speed": round(wind, 1),
                    "wind_speed_kmh": round(wind, 1),
                    "pressure": pressure,
                    "source": "live",
                    "source_name": "Open-Meteo Live Radar Feed",
                    "resolved_location": resolved_label,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                    "forecast_3day": forecast_3day,
                    "advisory": {
                        "spraying_index": spraying_idx,
                        "irrigation_need": irr_need,
                        "drainage_advisory": "Ensure field drainage channels are clear of weeds and silt."
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
        state: Optional[str] = None,
        farmer_crops: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        # 1. Validate coordinates if explicitly supplied
        resolved_label = "Custom Coordinates"
        if latitude is not None and longitude is not None:
            if not (-90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0):
                return {
                    "location_unresolved": True,
                    "error": f"Invalid latitude/longitude coordinates: ({latitude}, {longitude})",
                    "message": "Supplied coordinates are outside valid geographic bounds (-90..90, -180..180).",
                    "source": "unavailable",
                    "source_name": "Invalid Geographic Coordinates",
                    "resolved_location": "Invalid Coordinates",
                    "temperature": None,
                    "condition": "Unavailable",
                    "rain_probability": None,
                    "humidity": None,
                    "wind_speed": None,
                    "forecast_3day": [],
                    "actionable_advice": []
                }
            if district or state:
                resolved_label = f"{district.title() if district else ''}{', ' if district and state else ''}{state.title() if state else ''}"
            else:
                resolved_label = f"Coordinates ({latitude:.4f}, {longitude:.4f})"
        else:
            lat, lon, label = self.resolve_coordinates(district=district, state=state)
            if lat is None or lon is None:
                return {
                    "location_unresolved": True,
                    "error": "Location coordinates could not be resolved from provided farm details.",
                    "message": "Please configure your state and district in the farm profile to view live weather.",
                    "source": "unavailable",
                    "source_name": "Location Resolution Unresolved",
                    "resolved_location": "Location Unresolved",
                    "temperature": None,
                    "condition": "Unavailable",
                    "rain_probability": None,
                    "humidity": None,
                    "wind_speed": None,
                    "forecast_3day": [],
                    "actionable_advice": []
                }
            latitude, longitude = lat, lon
            resolved_label = label

        # 2. Try live fetch
        live_data = self.fetch_live_weather(latitude, longitude, resolved_label)
        if live_data:
            live_data["actionable_advice"] = self.generate_actionable_advice(live_data, farmer_crops)
            return live_data

        # 3. Fallback
        fallback_data = self.get_fallback_weather(
            reason="Live Open-Meteo provider unreachable; using regional baseline cache.",
            state=state,
            resolved_label=resolved_label
        )
        fallback_data["actionable_advice"] = self.generate_actionable_advice(fallback_data, farmer_crops)
        return fallback_data


weather_provider = WeatherProvider()
