import sys
from pathlib import Path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from datetime import datetime
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.koyambedu_service import (
    KoyambeduService,
    koyambedu_service,
    PERSISTENT_SNAPSHOT_PATH,
    REFERENCE_SNAPSHOT_PATH
)
from app.services.mandi_service import MandiService, mandi_service
from app.services.market_provider import market_provider, get_verified_msp_info
from app.services.weather_provider import WMO_CODE_TO_CONDITION, weather_provider
from app.services.weather_service import weather_service
from app.services.scheme_engine import scheme_engine
from app.services.farmer_service import farmer_service

client = TestClient(app)


# ==============================================================================
# 1. KOYAMBEDU INTEGRATION & GEOGRAPHIC ISOLATION (THANJAVUR ONLY)
# ==============================================================================

def test_thanjavur_profile_can_access_koyambedu_benchmark():
    """Verify demo_farmer_03 (Thanjavur, Tamil Nadu) has access to Koyambedu benchmark data."""
    # Direct service check
    result = mandi_service.get_koyambedu_benchmark(farmer_id="demo_farmer_03")
    assert isinstance(result, dict)
    assert result["eligible"] is True
    data = result["data"]
    assert len(data) > 0, "Thanjavur profile must receive Koyambedu benchmark records"
    for item in data:
        assert "koyambedu" in item["market"].lower()
        assert item["unit"].startswith("₹ / ")
        assert item.get("is_benchmark") is True
        assert "Chennai" in item.get("benchmark_notice", "")

    # API endpoint check
    resp = client.get("/api/mandi/koyambedu-benchmark?farmer_id=demo_farmer_03")
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["eligible"] is True
    assert len(res_data["data"]) > 0


def test_nagpur_profile_strictly_blocked_from_koyambedu():
    """Verify demo_farmer_01 (Nagpur, Maharashtra) CANNOT receive Koyambedu benchmark results."""
    # Service call for Nagpur farmer returns eligible: False with empty data
    result = mandi_service.get_koyambedu_benchmark(farmer_id="demo_farmer_01")
    assert result["eligible"] is False
    assert result["data"] == []
    assert "Thanjavur, Tamil Nadu" in result["message"]

    # API route returns eligible: False and empty data
    resp = client.get("/api/mandi/koyambedu-benchmark?farmer_id=demo_farmer_01")
    assert resp.status_code == 200
    json_resp = resp.json()
    assert json_resp["eligible"] is False
    assert json_resp["data"] == []

    # Directly requesting source=koyambedu for Nagpur via get_prices returns empty list
    prices = mandi_service.get_prices(source_filter="koyambedu", farmer_id="demo_farmer_01")
    assert prices == []


def test_other_profiles_strictly_blocked_from_koyambedu():
    """Verify Rajkot and Bhatinda profiles cannot receive Koyambedu results."""
    for fid in ["demo_farmer_02", "demo_farmer_04", "unknown_farmer_99"]:
        res = mandi_service.get_koyambedu_benchmark(farmer_id=fid)
        assert res["eligible"] is False, f"Profile {fid} must not be eligible for Koyambedu"
        assert res["data"] == []

        resp = client.get(f"/api/mandi/koyambedu-benchmark?farmer_id={fid}")
        assert resp.status_code == 200
        assert resp.json()["eligible"] is False
        assert resp.json()["data"] == []


def test_no_koyambedu_leak_in_standard_mandi_queries_for_nagpur():
    """Verify querying standard mandi prices for Nagpur never includes Koyambedu records."""
    nagpur_records = mandi_service.get_prices(farmer_id="demo_farmer_01")
    assert len(nagpur_records) > 0
    for record in nagpur_records:
        assert "koyambedu" not in record.get("market", "").lower()
        assert record.get("state") == "Maharashtra"


def test_source_failure_retains_last_valid_data():
    """Verify an upstream network failure retains stored snapshot data without replacing with empty results."""
    service = KoyambeduService()
    with patch.object(service, "fetch_live_prices", return_value=None):
        records = service.get_benchmark_prices()
        assert isinstance(records, list)
        assert len(records) > 0
        for item in records:
            assert item["data_status"] in ("live", "cached", "stale", "manual_reference")
            assert "Koyambedu" in item["market"]


def test_commodity_filtering_does_not_return_unrelated_records():
    """Verify Koyambedu filtering returns only requested commodity."""
    onion_records = koyambedu_service.get_benchmark_prices(commodity="Onion")
    assert len(onion_records) > 0
    for rec in onion_records:
        assert "onion" in rec["commodity"].lower()


def test_units_and_price_types_correctly_identified():
    """Verify price units and types are correctly identified and never conflated."""
    records = koyambedu_service.get_benchmark_prices()
    for rec in records:
        assert rec["unit"].startswith("₹ / ")
        assert rec["price_category"] == "wholesale_benchmark"
        assert rec["min_price"] <= rec["max_price"]
        assert rec["min_price"] <= rec["modal_price"] <= rec["max_price"]


def test_msp_never_inferred_from_market_price():
    """Verify MSP values are never inferred or derived from Koyambedu market price."""
    records = koyambedu_service.get_benchmark_prices()
    for rec in records:
        # Perishable vegetables like Yam, Tomato, Cucumber have no MSP
        assert rec.get("msp") is None
        assert "unavailable" in rec.get("msp_source", "").lower()


def test_malformed_records_rejected():
    """Verify that rows with negative prices or min_price > max_price are safely rejected."""
    service = KoyambeduService()
    mock_bad_items = [
        {"nameInEnglish": "Valid Onion", "minPrice": 20, "maxPrice": 30, "units": "1 Kg"},
        {"nameInEnglish": "Negative Price", "minPrice": -10, "maxPrice": 20, "units": "1 Kg"},
        {"nameInEnglish": "Inverted Range", "minPrice": 50, "maxPrice": 20, "units": "1 Kg"},
        {"nameInEnglish": "", "minPrice": 10, "maxPrice": 20, "units": "1 Kg"}
    ]
    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps({"response": "dummy_b64"}).encode("utf-8")
    mock_urlopen = MagicMock()
    mock_urlopen.__enter__.return_value = mock_resp

    with patch.object(service, "_get_access_token", return_value="dummy_token"), \
         patch.object(service, "_decrypt", return_value={"response": mock_bad_items}), \
         patch("urllib.request.urlopen", return_value=mock_urlopen):
        records = service.fetch_live_prices()
        assert records is not None
        assert len(records) == 1
        assert records[0]["commodity"] == "Valid Onion"


def test_dataset_persistence_and_daily_refresh_cooldown():
    """Verify persistent disk snapshot exists and daily refresh cooldown skips unnecessary network calls."""
    assert PERSISTENT_SNAPSHOT_PATH.exists()
    content = json.loads(PERSISTENT_SNAPSHOT_PATH.read_text(encoding="utf-8"))
    assert content["records_count"] >= 30
    assert len(content["records"]) >= 30

    # Test that consecutive calls reuse stored snapshot without calling fetch_live_prices
    service = KoyambeduService()
    with patch.object(service, "fetch_live_prices") as mock_fetch:
        bundle = service.get_benchmark_bundle(force_refresh=False)
        assert bundle["status"] in ("cached", "live", "stale")
        assert len(bundle["records"]) >= 30
        mock_fetch.assert_not_called()


def test_manual_reference_dataset_integrity():
    """Verify data/koyambedu_reference_prices.json has exact 32 visual reference rows from portal screenshot."""
    assert REFERENCE_SNAPSHOT_PATH.exists()
    ref_data = json.loads(REFERENCE_SNAPSHOT_PATH.read_text(encoding="utf-8"))
    assert ref_data["source_type"] == "manual_reference"
    assert ref_data["is_live"] is False
    assert ref_data["records_count"] == 32
    assert len(ref_data["records"]) == 32

    # Check key items from user screenshot
    records_by_name = {r["commodity"]: r for r in ref_data["records"]}
    assert records_by_name["Tomato"]["min_price"] == 21.0
    assert records_by_name["Tomato"]["max_price"] == 28.0
    assert records_by_name["Tomato"]["unit"] == "1 Kg"

    assert records_by_name["Raw Banana"]["min_price"] == 3.5
    assert records_by_name["Raw Banana"]["max_price"] == 9.0
    assert records_by_name["Raw Banana"]["unit"] == "1 Piece"

    assert records_by_name["Coriander Leaves"]["min_price"] == 300.0
    assert records_by_name["Coriander Leaves"]["max_price"] == 400.0
    assert records_by_name["Coriander Leaves"]["unit"] == "1 Set"


def test_manual_refresh_endpoint_and_cooldown():
    """Verify /api/mandi/koyambedu-benchmark/refresh triggers refresh for Thanjavur and obeys cooldown."""
    resp = client.post("/api/mandi/koyambedu-benchmark/refresh?farmer_id=demo_farmer_03")
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["eligible"] is True
    assert len(res_data["data"]) >= 30

    # Second immediate call should not error and should safely return cached bundle
    resp2 = client.post("/api/mandi/koyambedu-benchmark/refresh?farmer_id=demo_farmer_03")
    assert resp2.status_code == 200


# ==============================================================================
# 2. WEATHER CONDITION ACCURACY ACROSS ALL PROFILES
# ==============================================================================

def test_wmo_code_mapping_day_night_awareness():
    """Verify WMO code 0 distinguishes Clear Sky (night) vs Clear & Sunny (day)."""
    # Code 0 at night -> Clear Sky, spraying_safe: True
    cond_night, safe_night = WMO_CODE_TO_CONDITION(0, is_day=0)
    assert cond_night == "Clear Sky"
    assert safe_night is True

    # Code 0 during day -> Clear & Sunny, spraying_safe: True
    cond_day, safe_day = WMO_CODE_TO_CONDITION(0, is_day=1)
    assert cond_day == "Clear & Sunny"
    assert safe_day is True

    # Code 1 -> Mainly Clear
    cond_1, safe_1 = WMO_CODE_TO_CONDITION(1)
    assert cond_1 == "Mainly Clear"
    assert safe_1 is True

    # Code 2 -> Partly Cloudy
    cond_2, safe_2 = WMO_CODE_TO_CONDITION(2)
    assert cond_2 == "Partly Cloudy"
    assert safe_2 is True

    # Code 3 -> Overcast, spraying_safe: False
    cond_3, safe_3 = WMO_CODE_TO_CONDITION(3)
    assert cond_3 == "Overcast"
    assert safe_3 is False

    # Code 61 -> Light Rain, spraying_safe: False
    cond_rain, safe_rain = WMO_CODE_TO_CONDITION(61)
    assert cond_rain == "Light Rain"
    assert safe_rain is False


def test_unknown_wmo_code_never_defaults_to_clear_and_sunny():
    """Verify unknown or None WMO code returns Unknown Condition, never Clear & Sunny."""
    cond_none, safe_none = WMO_CODE_TO_CONDITION(None)
    assert cond_none == "Unknown Condition"
    assert cond_none != "Clear & Sunny"
    assert safe_none is False

    cond_invalid, safe_invalid = WMO_CODE_TO_CONDITION(999)
    assert cond_invalid == "Unknown Condition"
    assert cond_invalid != "Clear & Sunny"
    assert safe_invalid is False


def test_all_four_profiles_have_distinct_fallback_weather():
    """Verify fallback weather across the 4 farmer profiles reflects their distinct agro-climatic zones."""
    profiles = ["demo_farmer_01", "demo_farmer_02", "demo_farmer_03", "demo_farmer_04"]
    weather_results = {}

    for pid in profiles:
        weather = weather_service.get_current_weather(farmer_id=pid)
        assert weather is not None
        weather_results[pid] = weather
        # Both live weather and fallback output valid condition and forecast
        assert "condition" in weather
        assert weather["condition"]
        assert "forecast_3day" in weather
        assert len(weather["forecast_3day"]) == 3

    # Check state-specific fallback agro-climatic differences
    fb_mh = weather_provider.get_fallback_weather(state="Maharashtra")
    fb_tn = weather_provider.get_fallback_weather(state="Tamil Nadu")
    fb_gj = weather_provider.get_fallback_weather(state="Gujarat")
    fb_pb = weather_provider.get_fallback_weather(state="Punjab")

    assert fb_mh["condition"] == "Partly Cloudy"
    assert fb_tn["condition"] == "Warm & Humid"
    assert fb_gj["condition"] == "Sunny & Dry"
    assert fb_pb["condition"] == "Clear"

    assert fb_tn["temperature"] != fb_mh["temperature"]


# ==============================================================================
# 3. MANDI DATA INTEGRITY & HEAD REQUEST SUPPORT
# ==============================================================================

def test_mandi_head_method_supported():
    """Verify HEAD requests on /api/mandi and /api/mandi/price return 200 without payload."""
    resp1 = client.head("/api/mandi")
    assert resp1.status_code == 200
    assert resp1.content == b""

    resp2 = client.head("/api/mandi/price")
    assert resp2.status_code == 200
    assert resp2.content == b""

    resp3 = client.head("/api/mandi/koyambedu-benchmark")
    assert resp3.status_code == 200


def test_mandi_empty_result_on_mismatch_no_cross_state_leakage():
    """Verify searching for a non-existent commodity or district returns [] without leakage."""
    res = mandi_service.get_prices(crop_filter="NonExistentDragonFruit123")
    assert res == []

    res_loc = mandi_service.get_prices(state_filter="Goa", district_filter="Panaji")
    assert res_loc == []


# ==============================================================================
# 4. GOVERNMENT SCHEME ACCURACY & 4-WAY ELIGIBILITY
# ==============================================================================

def test_four_way_eligibility_status_values():
    """Verify scheme engine returns distinct status: eligible, potentially_eligible, ineligible, insufficient_information."""
    # 1. Fully eligible
    full_farmer = {
        "id": "demo_farmer_01",
        "land_size_acres": 2.5,
        "crops": ["cotton", "wheat"],
        "state": "Maharashtra",
        "owns_land": True,
        "is_tax_payer": False,
        "has_irrigation": True,
        "age": 40
    }
    pm_kisan = scheme_engine.get_scheme_by_id("pm_kisan")
    res_eligible = scheme_engine.evaluate_eligibility(pm_kisan, full_farmer)
    assert res_eligible["eligible"] is True
    assert res_eligible["eligibility_status"] == "eligible"

    # 2. Potentially eligible (requires irrigation verification)
    pmksy = scheme_engine.get_scheme_by_id("pmksy_pdmc_micro_irrigation")
    res_pot = scheme_engine.evaluate_eligibility(pmksy, full_farmer)
    assert res_pot["eligible"] is True
    assert res_pot["eligibility_status"] == "potentially_eligible"

    # 3. Ineligible (Tax payer excluded)
    tax_farmer = dict(full_farmer)
    tax_farmer["is_tax_payer"] = True
    res_inel = scheme_engine.evaluate_eligibility(pm_kisan, tax_farmer)
    assert res_inel["eligible"] is False
    assert res_inel["eligibility_status"] == "ineligible"

    # 4. Insufficient information (empty profile)
    res_insuf = scheme_engine.evaluate_eligibility(pm_kisan, {})
    assert res_insuf["eligible"] is False
    assert res_insuf["eligibility_status"] == "insufficient_information"

    # 5. Insufficient information (missing land size for land-restricted scheme)
    no_land_farmer = {"state": "Maharashtra", "crops": ["cotton"]}
    res_no_land = scheme_engine.evaluate_eligibility(pmksy, no_land_farmer)
    assert res_no_land["eligible"] is False
    assert res_no_land["eligibility_status"] == "insufficient_information"


# ==============================================================================
# 5. GROQ-ONLY CONFIGURATION VERIFICATION
# ==============================================================================

def test_groq_is_sole_active_provider_no_gemini():
    """Verify Groq is configured and no active Gemini SDK or calls exist in codebase."""
    import inspect
    from app.routers import ai

    # Verify Groq is imported in ai router
    assert hasattr(ai, "Groq")

    # Verify no Google Generative AI SDK is imported
    source = inspect.getsource(ai)
    assert "google.generativeai" not in source
    assert "import google" not in source
    assert "GeminiClient" not in source
