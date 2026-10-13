import json
import re
from datetime import datetime
from unittest.mock import MagicMock, patch
import urllib.error

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import DiaryEntry, Farmer, SessionLocal
from app.services.farmer_service import farmer_service
from app.services.recommendation_service import recommendation_service
from app.services.weather_provider import DISTRICT_COORDINATES, WeatherProvider, weather_provider
from app.services.weather_service import weather_service

client = TestClient(app)


# ==============================================================================
# 1. KNOWN DISTRICT COORDINATE RESOLUTION TESTS
# ==============================================================================

def test_known_district_coordinate_resolution():
    """Verify that known agricultural districts across different states resolve to their true coordinates, never defaulting to Nagpur."""
    # Nagpur (Maharashtra)
    lat_ngp, lon_ngp, label_ngp = weather_provider.resolve_coordinates("nagpur", "Maharashtra")
    assert lat_ngp is not None and lon_ngp is not None
    assert "Nagpur" in label_ngp
    assert abs(lat_ngp - 21.1458) < 0.05
    assert abs(lon_ngp - 79.0882) < 0.05

    # Thanjavur (Tamil Nadu) - Must NOT be Nagpur
    lat_tn, lon_tn, label_tn = weather_provider.resolve_coordinates("thanjavur", "Tamil Nadu")
    assert lat_tn is not None and lon_tn is not None
    assert "Thanjavur" in label_tn
    assert abs(lat_tn - 10.7870) < 0.05
    assert abs(lon_tn - 79.1378) < 0.05
    assert abs(lat_tn - lat_ngp) > 5.0, "Thanjavur latitude must not be Nagpur"

    # Rajkot (Gujarat) - Must NOT be Nagpur
    lat_gj, lon_gj, label_gj = weather_provider.resolve_coordinates("rajkot", "Gujarat")
    assert lat_gj is not None and lon_gj is not None
    assert "Rajkot" in label_gj
    assert abs(lat_gj - 22.3039) < 0.05
    assert abs(lon_gj - 70.8022) < 0.05
    assert abs(lon_gj - lon_ngp) > 5.0, "Rajkot longitude must not be Nagpur"

    # Bhatinda (Punjab) - Must NOT be Nagpur
    lat_pb, lon_pb, label_pb = weather_provider.resolve_coordinates("bhatinda", "Punjab")
    assert lat_pb is not None and lon_pb is not None
    assert "Bhatinda" in label_pb
    assert abs(lat_pb - 30.2110) < 0.05
    assert abs(lon_pb - 74.9455) < 0.05
    assert abs(lat_pb - lat_ngp) > 5.0, "Bhatinda latitude must not be Nagpur"


# ==============================================================================
# 2. UNKNOWN DISTRICT WITHOUT COORDINATES
# ==============================================================================

def test_unknown_district_without_coordinates():
    """Verify that an unknown district without valid coordinates returns unresolved status, never silent Nagpur coordinates."""
    # Completely unknown district and state
    lat, lon, label = weather_provider.resolve_coordinates("NonExistentCity1234", "FakeState999")
    assert lat is None
    assert lon is None
    assert label == "Location Unresolved"

    # Unknown district without any state
    lat2, lon2, label2 = weather_provider.resolve_coordinates("UnknownPlaceWithoutState")
    assert lat2 is None
    assert lon2 is None
    assert label2 == "Location Unresolved"

    # Querying weather for unknown location returns location_unresolved: True, source: unavailable
    res = client.get("/api/weather/current?district=NonExistentCity1234&state=FakeState999")
    assert res.status_code == 200
    data = res.json()
    assert data.get("location_unresolved") is True
    assert data.get("source") == "unavailable"
    assert data.get("temperature") is None
    assert "Location Unresolved" in data.get("resolved_location", "")


# ==============================================================================
# 3. EXPLICIT LATITUDE AND LONGITUDE
# ==============================================================================

def test_explicit_valid_latitude_longitude():
    """Verify that explicit latitude and longitude coordinates are honored directly."""
    # Explicit coordinates for Chennai (13.0827, 80.2707)
    res = client.get("/api/weather/current?lat=13.0827&lon=80.2707")
    assert res.status_code == 200
    data = res.json()
    assert not data.get("location_unresolved")
    assert data.get("temperature") is not None
    assert data.get("source") in ("live", "fallback")
    assert "Coordinates (13.0827, 80.2707)" in data.get("resolved_location", "")


def test_explicit_out_of_bounds_latitude_longitude():
    """Verify that invalid out-of-bounds coordinates are safely rejected with location_unresolved."""
    res = client.get("/api/weather/current?lat=195.0&lon=240.0")
    assert res.status_code == 200
    data = res.json()
    assert data.get("location_unresolved") is True
    assert data.get("source") == "unavailable"
    assert "Invalid" in data.get("error", "")


# ==============================================================================
# 4. LIVE WEATHER SUCCESS AND FAILURE HANDLING
# ==============================================================================

def test_live_weather_fetch_success():
    """Verify successful live weather parsing generates accurate source metadata, UTC timestamps, and forecast."""
    fake_open_meteo_response = {
        "current": {
            "temperature_2m": 31.4,
            "relative_humidity_2m": 62,
            "surface_pressure": 1012,
            "wind_speed_10m": 11.5,
            "weather_code": 1
        },
        "daily": {
            "time": ["2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"],
            "weather_code": [1, 2, 0, 1],
            "temperature_2m_max": [33.0, 32.5, 34.0, 33.5],
            "temperature_2m_min": [24.0, 23.5, 24.5, 23.0],
            "precipitation_probability_max": [15, 20, 10, 5],
            "precipitation_sum": [0.0, 0.2, 0.0, 0.0]
        }
    }

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps(fake_open_meteo_response).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        live_result = weather_provider.fetch_live_weather(21.1458, 79.0882, "Nagpur, Maharashtra")
        assert live_result is not None
        assert live_result["source"] == "live"
        assert "Open-Meteo" in live_result["source_name"]
        assert live_result["temperature"] == 31.4
        assert live_result["rain_probability"] == 15
        assert live_result["precipitation_probability"] == 15
        assert live_result["precipitation_mm"] == 0.0
        assert len(live_result["forecast_3day"]) == 3
        # Forecast day 1 is Tomorrow (2026-10-14, index 1)
        assert live_result["forecast_3day"][0]["date"] == "2026-10-14"
        assert live_result["forecast_3day"][0]["rain_prob"] == 20
        # Timestamp must be current ISO UTC format
        assert "T" in live_result["fetched_at"]


def test_live_weather_failure_falls_back_safely():
    """Verify that network failures or timeouts safely fall back to regional baseline with fallback source labelling."""
    with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("Connection refused")):
        res = weather_provider.get_current_weather(
            district="thanjavur",
            state="Tamil Nadu"
        )
        assert res is not None
        assert res.get("source") == "fallback"
        assert "Baseline" in res.get("source_name", "")
        assert "fallback_reason" in res
        assert "Connection refused" in res["fallback_reason"] or "unreachable" in res["fallback_reason"]
        assert res.get("temperature") is not None
        assert res.get("rain_probability") is not None


# ==============================================================================
# 5. CORRECT FALLBACK LABELLING (NEVER SILENTLY TREAT MOCK AS LIVE)
# ==============================================================================

def test_fallback_weather_is_never_labeled_live():
    """Verify fallback weather cache is explicitly labelled fallback and never misrepresents as live."""
    fallback_data = weather_provider.get_fallback_weather(
        reason="Network timeout",
        state="Punjab",
        resolved_label="Bhatinda, Punjab"
    )
    assert fallback_data["source"] == "fallback"
    assert fallback_data["source"] != "live"
    assert "Historical" in fallback_data["source_name"] or "Baseline" in fallback_data["source_name"]
    assert "Live" not in fallback_data["source_name"]
    assert "Network timeout" in fallback_data["fallback_reason"]


def test_mock_weather_json_is_labeled_mock():
    """Verify mock_weather.json entries are labelled mock/fallback and do not contain stale 2026-08-27 dates."""
    mock_file = weather_provider.mock_weather_file
    assert mock_file.exists(), "mock_weather.json must exist"
    with open(mock_file, "r", encoding="utf-8") as f:
        mock_data = json.load(f)

    for state_key, state_weather in mock_data.items():
        assert state_weather["source"] in ("mock", "fallback"), f"State {state_key} must not be labeled live"
        assert state_weather["source"] != "live"
        assert "2026-08-27" not in state_weather.get("fetched_at", "")
        for day in state_weather.get("forecast_3day", []):
            assert "Tomorrow (Thu)" not in day.get("day", "")


# ==============================================================================
# 6. CONSISTENT FORECAST AND ADVISORY VALUES
# ==============================================================================

def test_forecast_and_advisory_consistency():
    """Verify rain probability, temperature bounds, and spraying safe flags are logically consistent."""
    # Test high rain condition
    wet_fallback = weather_provider.get_fallback_weather(reason="Test", state="Tamil Nadu")
    # Advisory spraying_index must not contradict rain probability
    if wet_fallback["rain_probability"] > 50:
        assert "UNSAFE" in wet_fallback["advisory"]["spraying_index"]
    else:
        assert "SAFE" in wet_fallback["advisory"]["spraying_index"] or "CAUTION" in wet_fallback["advisory"]["spraying_index"]

    # Forecast days must have temp_max >= temp_min
    for day in wet_fallback["forecast_3day"]:
        assert day["temp_max"] >= day["temp_min"]
        assert 0 <= day["rain_prob"] <= 100
        if day["rain_prob"] > 40:
            assert day["spraying_safe"] is False


# ==============================================================================
# 7. RECOMMENDATION BEHAVIOUR WHEN WEATHER IS MISSING
# ==============================================================================

def test_recommendation_when_weather_missing():
    """Verify recommendation service handles unresolved weather gracefully without inventing fake advice."""
    # Mock weather_service to return location_unresolved
    unresolved_weather = {
        "location_unresolved": True,
        "source": "unavailable",
        "temperature": None,
        "rain_probability": None
    }

    with patch.object(weather_service, "get_current_weather", return_value=unresolved_weather):
        rec = recommendation_service.get_recommendation("demo_farmer_01")
        assert rec["decision_type"] == "data_required"
        assert "LOCATION" in rec["action"].upper()
        assert "Location coordinates could not be resolved" in rec["reasoning"] or "telemetry" in rec["reasoning"].lower()
        # Must not fabricate a postponement date or spraying claim
        assert rec["recommended_new_date"] is None


# ==============================================================================
# 8. RECOMMENDATION BEHAVIOUR WHEN DIARY DATA IS MISSING
# ==============================================================================

def test_recommendation_when_diary_has_no_planned_activities():
    """Verify recommendation service does not invent fake planned tasks when diary has no planned operations."""
    # Mock diary entries to be empty
    with patch.object(farmer_service, "get_diary_entries", return_value=[]):
        rec = recommendation_service.get_recommendation("demo_farmer_01")
        # Must acknowledge that no planned activities exist in the diary
        assert "No upcoming activities" in rec["reasoning"] or "No planned activities" in rec["reasoning"]
        # Must NOT claim 'Your farm diary logs pesticide spraying tomorrow at 2:00 PM'
        assert "pesticide spraying tomorrow at 2:00 PM" not in rec["reasoning"]
        assert "45-60mm rain" not in rec["reasoning"]


# ==============================================================================
# 9. NO STALE HARDCODED DATES, NO FABRICATED SAVINGS, AND NO UNIVERSAL RAINFASTNESS
# ==============================================================================

def test_no_stale_dates_in_recommendations():
    """Verify recommendations contain no stale hardcoded dates (e.g. August 2026)."""
    for fid in ["demo_farmer_01", "demo_farmer_02", "demo_farmer_03", "demo_farmer_04"]:
        rec = recommendation_service.get_recommendation(fid)

        resched_date = str(rec.get("recommended_new_date") or "")
        headline = str(rec.get("headline") or "")
        reasoning = str(rec.get("reasoning") or "")
        ai_exp = str(rec.get("ai_explanation") or "")

        # Must not have stale August 2026 dates
        assert "29 August 2026" not in resched_date, f"Farmer {fid} has hardcoded 29 August 2026"
        assert "28 August 2026" not in resched_date, f"Farmer {fid} has hardcoded 28 August 2026"
        assert "27 August 2026" not in resched_date, f"Farmer {fid} has hardcoded 27 August 2026"
        assert "29 August 2026" not in reasoning
        assert "28 August 2026" not in reasoning
        assert "27 August 2026" not in reasoning


def test_no_universal_rainfastness_rule_prescribed():
    """Verify recommendation follows product label guidelines instead of prescribing universal 6-8 hour rules."""
    rec = recommendation_service.get_recommendation("demo_farmer_01")
    ai_exp = rec.get("ai_explanation", "")

    # Must NOT claim rigid universal absorption assertion
    assert "Chemical absorption (rainfastness) requires a minimum 6-8 hour dry window" not in ai_exp
    # Must refer to container label
    assert "label" in ai_exp.lower()


def test_no_fabricated_fixed_monetary_savings():
    """Verify that when a diary entry does not specify a cost, the system does not fabricate a fixed ₹1,800 savings."""
    fake_spray_entry = {
        "id": "diary_test_nocost",
        "farmer_id": "demo_farmer_01",
        "date": "2026-10-15",
        "activity_type": "Pesticide Spraying",
        "crop": "cotton",
        "notes": "Spraying for pest control",
        "quantity_cost": "",  # Empty cost
        "status": "planned"
    }

    # Simulate rainy weather to trigger postpone recommendation
    rainy_weather = {
        "temperature": 27.0,
        "condition": "Rain Showers",
        "rain_probability": 75,
        "humidity": 85,
        "wind_speed": 14.0,
        "source": "live",
        "forecast_3day": [{"day": "Day 2", "spraying_safe": True}]
    }

    with patch.object(farmer_service, "get_diary_entries", return_value=[fake_spray_entry]), \
         patch.object(weather_service, "get_current_weather", return_value=rainy_weather):
        rec = recommendation_service.get_recommendation("demo_farmer_01")
        # Must NOT claim 'Saves ₹1,800'
        assert "1,800" not in rec.get("estimated_impact", ""), "Must not invent ₹1,800 savings when cost is unspecified"
        assert "Protects input investment" in rec.get("estimated_impact", "")
