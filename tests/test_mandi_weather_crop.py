import sys
from pathlib import Path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.market_provider import market_provider, VERIFIED_MSP_DATA, get_verified_msp_info
from app.services.weather_provider import weather_provider
from app.services.crop_planner_service import crop_planner_service

client = TestClient(app)


# ==============================================================================
# 1. MANDI DATA INTEGRITY & SOURCE SEPARATION TESTS
# ==============================================================================

def test_mandi_no_cross_state_leakage():
    """Verify that querying a specific state returns ONLY records from that state."""
    # Query Tamil Nadu records
    tn_results = market_provider.load_fallback_data(state="Tamil Nadu")
    assert len(tn_results) > 0, "Tamil Nadu fallback records should exist"
    for item in tn_results:
        assert item["state"] == "Tamil Nadu", f"Expected Tamil Nadu, got {item['state']}"

    # Query Maharashtra records
    mh_results = market_provider.load_fallback_data(state="Maharashtra")
    assert len(mh_results) > 0, "Maharashtra fallback records should exist"
    for item in mh_results:
        assert item["state"] == "Maharashtra", f"Expected Maharashtra, got {item['state']}"


def test_fallback_filtering_empty_result_does_not_leak_all():
    """Verify that when no records match a filter, an empty list is returned, NOT the full dataset."""
    empty_results = market_provider.load_fallback_data(state="NonExistentStateXYZ")
    assert empty_results == [], "Filtering by non-existent state must return empty list, not leak entire dataset"


def test_verified_cacp_msp_not_fabricated():
    """Verify MSP is only attached when verified by CACP; never fabricated from market price."""
    # Cotton has verified CACP MSP
    cotton_msp = get_verified_msp_info("Cotton")
    assert cotton_msp is not None
    assert cotton_msp["msp"] in (7121, 7521)
    assert "2024-25" in cotton_msp["season_year"]
    assert "CACP" in cotton_msp["source"]

    # Soybean has verified CACP MSP
    soybean_msp = get_verified_msp_info("Soybean")
    assert soybean_msp is not None
    assert soybean_msp["msp"] == 4892

    # Onion does NOT have CACP MSP; must return None (or 'MSP data unavailable')
    onion_msp = get_verified_msp_info("Onion")
    assert onion_msp is None, "Onion does not have CACP MSP and must return None, not a fabricated percentage"

    # Tomato does NOT have CACP MSP; must return None
    tomato_msp = get_verified_msp_info("Tomato")
    assert tomato_msp is None, "Tomato does not have CACP MSP and must return None"


def test_mandi_source_separation():
    """Verify that AGMARKNET, Tamil Nadu wholesale, and Koyambedu terminal prices are separately identifiable."""
    # Koyambedu source filter
    koyambedu_results = market_provider.load_fallback_data(source_filter="koyambedu")
    assert len(koyambedu_results) > 0
    for item in koyambedu_results:
        assert "koyambedu" in item["market"].lower() or "koyambedu" in item.get("source_name", "").lower()
        assert item.get("price_category") == "wholesale_perishable"

    # Tamil Nadu source filter
    tn_results = market_provider.load_fallback_data(source_filter="tamil_nadu")
    assert len(tn_results) > 0
    for item in tn_results:
        assert item["state"] == "Tamil Nadu"

    # Agmarknet source filter
    agmark_results = market_provider.load_fallback_data(source_filter="agmarknet")
    assert len(agmark_results) > 0
    for item in agmark_results:
        assert "agmarknet" in item.get("source_name", "").lower()


def test_mandi_api_endpoint_profile_personalization():
    """Verify that calling /api/mandi/price with farmer_id filters by the farmer's state/location."""
    response = client.get("/api/mandi/price?farmer_id=demo_farmer_03")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # demo_farmer_03 is in Thanjavur, Tamil Nadu
    for item in data:
        assert item["state"] == "Tamil Nadu", f"Expected Tamil Nadu for demo_farmer_03, got {item['state']}"


# ==============================================================================
# 2. WEATHER LOCATION ACCURACY & ACTIONABLE ADVICE TESTS
# ==============================================================================

def test_weather_location_resolution_tamil_nadu():
    """Verify that district 'thanjavur' resolves to Tamil Nadu coordinates, not Nagpur."""
    lat, lon, label = weather_provider.resolve_coordinates("thanjavur", "Tamil Nadu")
    assert lat is not None and lon is not None
    assert "Thanjavur" in label
    # Thanjavur is approximately lat ~10.78, lon ~79.13; Nagpur is lat 21.14, lon 79.08
    assert 10.0 <= lat <= 11.5, f"Expected Thanjavur lat ~10.78, got {lat}"
    assert 78.5 <= lon <= 79.8, f"Expected Thanjavur lon ~79.13, got {lon}"


def test_weather_location_unresolved_flag():
    """Verify that unknown location returns (None, None, 'Location Unresolved') instead of silent Nagpur."""
    lat, lon, label = weather_provider.resolve_coordinates("UnknownCityXYZ", "NonExistentState")
    assert lat is None
    assert lon is None
    assert label == "Location Unresolved"


def test_actionable_weather_advice_generation():
    """Verify actionable advice is dynamically generated based on actual conditions."""
    # Wet forecast -> drainage prep, delay irrigation, postpone spraying
    wet_weather = {
        "precipitation_probability": 85,
        "rainfall_mm": 35.0,
        "wind_speed_kmh": 22.0,
        "soil_moisture": 88
    }
    advice_list = weather_provider.generate_actionable_advice(wet_weather, farmer_crops=["cotton"])
    actions = [a["action"].lower() for a in advice_list]

    assert any("delay irrigation" in a or "suspend irrigation" in a for a in actions)
    assert any("drainage" in a for a in actions)
    assert any("postpone" in a or "delay" in a for a in actions)

    # Dry weather -> consider irrigation, safe spraying window
    dry_weather = {
        "precipitation_probability": 5,
        "temperature": 34.0,
        "rainfall_mm": 0.0,
        "wind_speed_kmh": 6.0,
        "soil_moisture": 25
    }
    dry_advice = weather_provider.generate_actionable_advice(dry_weather, farmer_crops=["cotton"])
    dry_actions = [a["action"].lower() for a in dry_advice]

    assert any("irrigation" in a for a in dry_actions)
    assert any("favorable" in a or "spraying window" in a for a in dry_actions)


def test_weather_api_endpoint():
    """Verify weather endpoint returns location and actionable advice."""
    response = client.get("/api/weather/demo_farmer_01")
    assert response.status_code == 200
    data = response.json()
    assert "location" in data or "resolved_location" in data
    assert "actionable_advice" in data
    assert isinstance(data["actionable_advice"], list)
    assert len(data["actionable_advice"]) > 0


# ==============================================================================
# 3. ON-DEMAND CROP PLANNING ASSISTANT TESTS
# ==============================================================================

def test_crop_planner_generates_transparent_calculations():
    """Verify that crop planner estimates gross revenue, costs, and net return accurately."""
    plan = crop_planner_service.suggest_crop_plan(
        farmer_id="demo_farmer_01",
        state="Maharashtra",
        district="Nagpur",
        land_size_acres=2.5,
        soil_type="Black Cotton Soil",
        has_irrigation=True,
        season_override="kharif"
    )

    assert plan["farmer_context"]["land_size_acres"] == 2.5
    assert len(plan["candidates"]) > 0

    for cand in plan["candidates"]:
        fin = cand["financials"]
        # Gross revenue = yield * price
        expected_gross = round(fin["expected_yield_qtl_per_acre"] * fin["modal_price_per_qtl"])
        assert fin["gross_revenue_per_acre"] == expected_gross
        # Net return = gross - cost
        expected_net = expected_gross - fin["cultivation_cost_per_acre"]
        assert fin["net_return_per_acre"] == expected_net
        # Plot net return = net_per_acre * 2.5
        assert fin["net_return_full_plot"] == round(expected_net * 2.5)
        # Disclaimers & risks must be present
        assert len(cand["major_risks"]) > 0
        assert "disclaimer" in cand


def test_crop_planner_endpoint_post():
    """Verify on-demand crop planner POST endpoint works."""
    response = client.post("/api/recommendation/demo_farmer_01/crop-plan", json={
        "season": "kharif",
        "land_size_acres": 2.5
    })
    assert response.status_code == 200
    data = response.json()
    assert "candidates" in data
    assert len(data["candidates"]) > 0
    assert data["farmer_context"]["farmer_id"] == "demo_farmer_01"


# ==============================================================================
# 4. PROFILE INTEGRITY & 404 HANDLING (NO SILENT DEMO FALLBACK)
# ==============================================================================

def test_schemes_non_existent_farmer_returns_404():
    """Verify that requesting an invalid farmer ID returns HTTP 404, never silently substituting demo farmer."""
    response = client.get("/api/schemes/farmer/non_existent_farmer_id_9999/eligible")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ==============================================================================
# 5. AI CONTEXT GROUNDING & REASONING
# ==============================================================================

def test_ai_explain_incorporates_context():
    """Verify AI explanation incorporates contextual data and fallback functions safely."""
    response = client.post("/api/ai/explain", json={
        "farmer_id": "demo_farmer_01",
        "language": "en",
        "question": "Why should I postpone spraying?",
        "context": {
            "headline": "Postpone pesticide spraying to Saturday",
            "weather_forecast": "88% Thunderstorm expected with 45mm rain",
            "impact": "Saves ₹1,800 in washed chemical cost"
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert "explanation_text" in data
    assert len(data["explanation_text"]) > 0
    # Must not leak keys or error traces
    assert "GEMINI_API_KEY" not in data["explanation_text"]
    assert "GROQ_API_KEY" not in data["explanation_text"]
    assert "gemini" not in data.get("provider_used", "").lower()
    assert "traceback" not in data["explanation_text"].lower()
