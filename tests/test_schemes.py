import sys
from pathlib import Path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.scheme_engine import SchemeEngine, scheme_engine
from app.services.tts_service import TTSService, tts_service

client = TestClient(app)


# --- 1. Dataset & i18n Loading Tests ---

def test_schemes_dataset_loaded():
    """Verify data/schemes.json contains valid schemes with all required fields."""
    schemes = scheme_engine.get_all_schemes_raw()
    assert len(schemes) >= 5, "Should have at least 5 standard Indian government schemes"

    for scheme in schemes:
        assert "id" in scheme
        assert "name" in scheme
        assert "description" in scheme
        assert "eligibility_rules" in scheme
        assert "benefits" in scheme
        assert "required_documents" in scheme
        assert "application_steps" in scheme
        assert "department" in scheme
        assert "status" in scheme
        assert "official_source" in scheme
        assert "official_application_link" in scheme
        assert isinstance(scheme["required_documents"], list)
        assert isinstance(scheme["application_steps"], list)


def test_multilingual_translations_all_languages():
    """Verify all 4 languages (en, hi, ta, mr) have translations for all schemes."""
    languages = ["en", "hi", "ta", "mr"]
    schemes = scheme_engine.get_all_schemes_raw()

    for lang in languages:
        for scheme in schemes:
            localized = scheme_engine.localize_scheme(scheme, language=lang)
            assert localized["name"], f"Missing name for scheme {scheme['id']} in language {lang}"
            assert localized["description"], f"Missing description for scheme {scheme['id']} in language {lang}"
            assert localized["benefits"], f"Missing benefits for scheme {scheme['id']} in language {lang}"
            assert len(localized["required_documents"]) > 0, f"Missing documents for scheme {scheme['id']} in language {lang}"
            assert len(localized["application_steps"]) > 0, f"Missing application steps for scheme {scheme['id']} in language {lang}"
            assert localized["language"] == lang


# --- 2. Deterministic Eligibility Engine Tests ---

def test_demo_farmer_eligibility():
    """Verify demo farmer profile produces eligible results for core schemes."""
    demo_farmer = {
        "id": "demo_farmer_01",
        "name": "Ramesh Kumar",
        "state": "Maharashtra",
        "district": "Nagpur",
        "land_size_acres": 2.5,
        "crops": ["cotton", "soybean", "wheat"],
        "farmer_category": "small",
        "owns_land": True,
        "has_irrigation": True,
        "is_tax_payer": False,
        "age": 42
    }

    # PM-KISAN check
    pm_kisan = scheme_engine.get_scheme_by_id("pm_kisan")
    eval_pmkisan = scheme_engine.evaluate_eligibility(pm_kisan, demo_farmer)
    assert eval_pmkisan["eligible"] is True
    assert any("criteria" in r.lower() or "satisfies" in r.lower() or "ownership" in r.lower() for r in eval_pmkisan["reasons"])

    # PMFBY Crop Insurance check
    pmfby = scheme_engine.get_scheme_by_id("pmfby_crop_insurance")
    eval_pmfby = scheme_engine.evaluate_eligibility(pmfby, demo_farmer)
    assert eval_pmfby["eligible"] is True

    # KCC Scheme check
    kcc = scheme_engine.get_scheme_by_id("kcc_kisan_credit_card")
    eval_kcc = scheme_engine.evaluate_eligibility(kcc, demo_farmer)
    assert eval_kcc["eligible"] is True


def test_tax_payer_exclusion():
    """Verify income-tax paying farmer is excluded from PM-KISAN."""
    tax_farmer = {
        "id": "tax_payer_01",
        "land_size_acres": 2.0,
        "crops": ["wheat"],
        "owns_land": True,
        "is_tax_payer": True
    }
    pm_kisan = scheme_engine.get_scheme_by_id("pm_kisan")
    eval_res = scheme_engine.evaluate_eligibility(pm_kisan, tax_farmer)
    assert eval_res["eligible"] is False
    assert any("tax" in r.lower() for r in eval_res["reasons"])


def test_crop_restriction_evaluation():
    """Verify crop matching logic works deterministically."""
    custom_scheme = {
        "id": "rubber_subsidy",
        "name": "Rubber Plantation Scheme",
        "eligibility_rules": {
            "crop_types": ["rubber", "coffee"]
        }
    }
    wheat_farmer = {"crops": ["wheat", "paddy"]}
    rubber_farmer = {"crops": ["rubber"]}

    eval_wheat = scheme_engine.evaluate_eligibility(custom_scheme, wheat_farmer)
    assert eval_wheat["eligible"] is False
    assert any("rubber" in r.lower() for r in eval_wheat["reasons"])

    eval_rubber = scheme_engine.evaluate_eligibility(custom_scheme, rubber_farmer)
    assert eval_rubber["eligible"] is True


def test_state_restriction_evaluation():
    """Verify state restriction evaluation."""
    state_scheme = {
        "id": "karnataka_raita_siri",
        "name": "Karnataka Raita Siri Scheme",
        "eligibility_rules": {
            "state_restricted": ["Karnataka"]
        }
    }
    mh_farmer = {"state": "Maharashtra"}
    ka_farmer = {"state": "Karnataka"}

    assert scheme_engine.evaluate_eligibility(state_scheme, mh_farmer)["eligible"] is False
    assert scheme_engine.evaluate_eligibility(state_scheme, ka_farmer)["eligible"] is True


def test_age_restriction_evaluation():
    """Verify age boundaries are evaluated accurately."""
    kcc_scheme = {
        "id": "kcc_test",
        "eligibility_rules": {
            "min_age": 18,
            "max_age": 75
        }
    }
    assert scheme_engine.evaluate_eligibility(kcc_scheme, {"age": 16})["eligible"] is False
    assert scheme_engine.evaluate_eligibility(kcc_scheme, {"age": 85})["eligible"] is False
    assert scheme_engine.evaluate_eligibility(kcc_scheme, {"age": 35})["eligible"] is True


# --- 3. API Route Tests ---

def test_api_health():
    """Test health check endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_api_languages():
    """Test supported languages list."""
    response = client.get("/api/schemes/languages")
    assert response.status_code == 200
    langs = response.json()
    codes = [l["code"] for l in langs]
    assert "en" in codes
    assert "hi" in codes
    assert "ta" in codes
    assert "mr" in codes


def test_api_get_schemes_english():
    """Test /api/schemes in English."""
    response = client.get("/api/schemes?language=en")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 5
    assert data[0]["language"] == "en"
    assert "PM Kisan" in data[0]["name"] or "Pradhan Mantri" in data[0]["name"] or "Kisan" in data[0]["name"]


def test_api_get_schemes_hindi():
    """Test /api/schemes in Hindi."""
    response = client.get("/api/schemes?language=hi")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    pm_kisan = next(s for s in data if s["id"] == "pm_kisan")
    assert "प्रधानमंत्री किसान सम्मान निधि" in pm_kisan["name"]
    assert pm_kisan["language"] == "hi"
    assert len(pm_kisan["required_documents"]) > 0


def test_api_get_schemes_tamil():
    """Test /api/schemes in Tamil."""
    response = client.get("/api/schemes?language=ta")
    assert response.status_code == 200
    data = response.json()
    pm_kisan = next(s for s in data if s["id"] == "pm_kisan")
    assert "பிரதமர் கிசான்" in pm_kisan["name"]
    assert pm_kisan["language"] == "ta"


def test_api_get_schemes_marathi():
    """Test /api/schemes in Marathi."""
    response = client.get("/api/schemes?language=mr")
    assert response.status_code == 200
    data = response.json()
    pm_kisan = next(s for s in data if s["id"] == "pm_kisan")
    assert "प्रधानमंत्री किसान सन्मान निधी" in pm_kisan["name"]
    assert pm_kisan["language"] == "mr"


def test_api_get_schemes_with_farmer_id():
    """Test /api/schemes with farmer_id personalized eligibility."""
    response = client.get("/api/schemes?farmer_id=demo_farmer_01&language=hi")
    assert response.status_code == 200
    data = response.json()
    assert all("eligible" in s for s in data)
    assert any(s["eligible"] is True for s in data)


def test_api_get_scheme_by_id():
    """Test /api/schemes/{scheme_id}."""
    response = client.get("/api/schemes/pm_kisan?language=hi")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "pm_kisan"
    assert "प्रधानमंत्री किसान सम्मान निधि" in data["name"]
    assert data["language"] == "hi"


def test_api_get_scheme_not_found():
    """Test /api/schemes/{scheme_id} with invalid id."""
    response = client.get("/api/schemes/non_existent_scheme")
    assert response.status_code == 404


def test_api_check_scheme_eligibility():
    """Test /api/schemes/{scheme_id}/eligibility."""
    response = client.get("/api/schemes/pm_kisan/eligibility?farmer_id=demo_farmer_01&language=ta")
    assert response.status_code == 200
    data = response.json()
    assert data["scheme_id"] == "pm_kisan"
    assert "eligible" in data
    assert isinstance(data["reasons"], list)
    assert len(data["reasons"]) > 0


def test_api_scheme_audio_payload():
    """Test /api/schemes/{scheme_id}/audio returns accessibility narration script."""
    response = client.get("/api/schemes/pm_kisan/audio?language=hi")
    assert response.status_code == 200
    data = response.json()
    assert data["scheme_id"] == "pm_kisan"
    assert data["language"] == "hi"
    assert "narration_script" in data
    assert "योजना का नाम" in data["narration_script"]
    assert data["web_speech_supported"] is True
    assert data["web_speech_lang"] == "hi-IN"


# --- 4. Accessibility Data Shape Tests ---

def test_accessibility_data_shape():
    """Ensure flat array structure for documents and steps (Member 4 UI friendly)."""
    response = client.get("/api/schemes?language=en")
    data = response.json()
    for scheme in data:
        assert isinstance(scheme["required_documents"], list)
        assert all(isinstance(doc, str) for doc in scheme["required_documents"])
        assert isinstance(scheme["application_steps"], list)
        assert all(isinstance(step, str) for step in scheme["application_steps"])
        assert isinstance(scheme["eligibility_reasons"], list)


# --- 5. Dynamic Hot Reload Test ---

def test_dynamic_hot_reload_schemes_json(tmp_path):
    """Verify that editing the JSON file dynamically updates the engine without code changes."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    i18n_dir = data_dir / "i18n"
    i18n_dir.mkdir()

    # Initial schemes
    initial_schemes = [
        {
            "id": "test_scheme_1",
            "name": "Initial Test Scheme",
            "description": "Initial Description",
            "eligibility_rules": {"max_land_acres": 5, "crop_types": ["any"]},
            "benefits": "Test benefits",
            "required_documents": ["Aadhaar"],
            "application_steps": ["Step 1"],
            "department": "Test Dept",
            "status": "active",
            "last_updated": "2024-01-01",
            "official_source": "https://example.com",
            "official_application_link": "https://example.com"
        }
    ]

    schemes_file = data_dir / "schemes.json"
    schemes_file.write_text(json.dumps(initial_schemes), encoding="utf-8")

    engine = SchemeEngine(data_dir=data_dir)
    schemes = engine.get_all_schemes_raw()
    assert len(schemes) == 1
    assert schemes[0]["id"] == "test_scheme_1"

    # Add a new scheme dynamically
    new_scheme = {
        "id": "test_scheme_2",
        "name": "Dynamically Added Scheme",
        "description": "New dynamic description",
        "eligibility_rules": {"max_land_acres": 10, "crop_types": ["cotton"]},
        "benefits": "Extra benefits",
        "required_documents": ["7/12 Extract"],
        "application_steps": ["Online Application"],
        "department": "State Agriculture Dept",
        "status": "active",
        "last_updated": "2024-06-01",
        "official_source": "https://example.com/2",
        "official_application_link": "https://example.com/2"
    }
    updated_schemes = initial_schemes + [new_scheme]
    schemes_file.write_text(json.dumps(updated_schemes), encoding="utf-8")

    # Fetch without restart
    reloaded_schemes = engine.get_all_schemes_raw()
    assert len(reloaded_schemes) == 2
    assert reloaded_schemes[1]["id"] == "test_scheme_2"
    assert reloaded_schemes[1]["name"] == "Dynamically Added Scheme"
