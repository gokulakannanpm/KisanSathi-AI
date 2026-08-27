# TEAMMATE 2 REPORT — BACKEND / DATABASE / API INTEGRATION

**Role**: Backend / Database / API Integration Owner  
**Branch**: `dev` (merged and verified)  
**Status**: Completed & Fully Verified  

---

## Executive Summary

1. **Fix Scheme Eligibility Farmer Resolution (Critical)**: Updated `app/routers/schemes.py::_resolve_farmer_profile` so that when `farmer_id` is supplied, it looks up the real farmer record via `farmer_service.get_farmer_profile(farmer_id)` instead of defaulting to a static demo profile. Applied query parameter overrides on top of the real profile.
2. **Per-Farmer / Per-State Weather Variation (Critical)**: Verified and enhanced both Live (`Open-Meteo` / `OpenWeatherMap`) and Fallback (`mock_weather.json`) weather resolution so weather is dynamically scoped to each farmer's district/state.
3. **Dependency Manifest**: Created `requirements.txt` with pinned dependencies (`fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, `httpx`, `pytest`, `python-dotenv`).
4. **Git Cleanliness**: Updated `.gitignore` to include `node_modules/` and verified a clean working directory.
5. **Documentation Sync**: Updated `.env.example` to match active provider flags and API key options.

---

## 1. Scheme Eligibility Farmer Resolution Fix

### Before Fix
Any request to `/api/schemes` or `/api/schemes/{id}/eligibility` with `farmer_id` defaulted to Ramesh Kumar (2.5 acres, Maharashtra) via `scheme_engine.get_demo_farmer_profile()`, ignoring real farmer records stored in SQLite.

### After Fix
The endpoint looks up `farmer_service.get_farmer_profile(farmer_id)` and evaluates rules against that farmer's exact profile.

### Verification Comparison

#### `demo_farmer_01` (Ramesh Kumar, 2.5 Acres, Maharashtra, Small Category)
`GET /api/schemes/pmksy_pdmc_micro_irrigation/eligibility?farmer_id=demo_farmer_01`
```json
{
  "scheme_id": "pmksy_pdmc_micro_irrigation",
  "scheme_name": "PMKSY - Per Drop More Crop (Micro Irrigation)",
  "eligible": true,
  "reasons": [
    "Your landholding of 2.5 acres satisfies the scheme requirement."
  ],
  "criteria_evaluation": {
    "land_criteria": "PASSED: 2.5 acres is within allowed limit of 5.0 acres",
    "min_land_criteria": "PASSED: 2.5 acres meets minimum 0.2 acres requirement",
    "crop_criteria": "PASSED: All crops eligible (Universal)",
    "state_criteria": "PASSED: Pan-India National Scheme",
    "ownership_criteria": "PASSED: Farmer owns land",
    "irrigation_criteria": "PASSED: Assured irrigation source available",
    "category_criteria": "PASSED: Category 'small' eligible"
  }
}
```

#### `demo_farmer_04` (Vikram Singh, 12.0 Acres, Punjab, Large Category)
`GET /api/schemes/pmksy_pdmc_micro_irrigation/eligibility?farmer_id=demo_farmer_04`
```json
{
  "scheme_id": "pmksy_pdmc_micro_irrigation",
  "scheme_name": "PMKSY - Per Drop More Crop (Micro Irrigation)",
  "eligible": false,
  "reasons": [
    "Your landholding of 12.0 acres exceeds the maximum eligibility limit of 5.0 acres.",
    "Farmer category 'Large' is excluded (Eligible categories: small, marginal)."
  ],
  "criteria_evaluation": {
    "land_criteria": "FAILED: 12.0 acres exceeds maximum limit of 5.0 acres",
    "min_land_criteria": "PASSED: 12.0 acres meets minimum 0.2 acres requirement",
    "crop_criteria": "PASSED: All crops eligible (Universal)",
    "state_criteria": "PASSED: Pan-India National Scheme",
    "ownership_criteria": "PASSED: Farmer owns land",
    "irrigation_criteria": "PASSED: Assured irrigation source available",
    "category_criteria": "FAILED: Category 'large' excluded (Restricted to: small, marginal)"
  }
}
```

---

## 2. Per-Farmer / Per-State Weather Variation

### Live & Fallback Weather Scoping
`GET /api/weather/current?farmer_id={id}` resolves the farmer's district/state from `farmer_service.get_farmer_profile(farmer_id)` and returns location-specific weather:

#### `demo_farmer_01` (Nagpur, Maharashtra)
`GET /api/weather/current?farmer_id=demo_farmer_01`
- **Live**: `26.3°C`, Heavy Rain & Thunderstorms (Rain Prob: 88%)
- **Fallback**: `28.4°C`, Heavy Rain & Thunderstorms (Rain Prob: 88%)

#### `demo_farmer_02` (Rajkot, Gujarat)
`GET /api/weather/current?farmer_id=demo_farmer_02`
- **Live**: `32.0°C`, Partly Cloudy (Rain Prob: 10%)
- **Fallback**: `36.0°C`, Sunny & Hot (Rain Prob: 10%)

#### `demo_farmer_03` (Thanjavur, Tamil Nadu)
`GET /api/weather/current?farmer_id=demo_farmer_03`
- **Live**: `30.6°C`, Light Drizzle (Rain Prob: 65%)
- **Fallback**: `30.2°C`, Scattered Thunderstorms (Rain Prob: 65%)

#### `demo_farmer_04` (Bhatinda, Punjab)
`GET /api/weather/current?farmer_id=demo_farmer_04`
- **Live**: `31.0°C`, Clear & Sunny (Rain Prob: 5%)
- **Fallback**: `31.0°C`, Clear & Sunny (Rain Prob: 5%)

---

## 3. Dependency Manifest & Automated Test Verification

### `requirements.txt`
```text
fastapi>=0.100.0,<1.0.0
uvicorn>=0.20.0,<1.0.0
sqlalchemy>=2.0.0,<3.0.0
pydantic>=2.0.0,<3.0.0
httpx>=0.24.0,<1.0.0
pytest>=7.0.0,<9.0.0
python-dotenv>=1.0.0,<2.0.0
```

### Automated Verification (`python scripts/verify_app.py`)
```text
============================================================
TESTING KISANSATHI-AI ENDPOINTS VIA TESTCLIENT
============================================================
[PASS] | Health Check              | Status 200 == 200
[PASS] | Root Endpoint             | Status 200 == 200
[PASS] | Schemes List              | Status 200 == 200
[PASS] | Single Scheme             | Status 200 == 200
[PASS] | Scheme Eligibility        | Status 200 == 200
[PASS] | Farmer Profile            | Status 200 == 200
[PASS] | Farmer Diary              | Status 200 == 200
[PASS] | Add Diary Entry           | Status 201 == 201
[PASS] | Current Weather           | Status 200 == 200
[PASS] | Mandi Prices (All)        | Status 200 == 200
[PASS] | Mandi Prices (Filtered)   | Status 200 == 200
[PASS] | Recommendation Engine     | Status 200 == 200
[PASS] | AI Explainer              | Status 200 == 200
[PASS] | Unknown Farmer 404        | Status 404 == 404
[PASS] | Unknown Scheme 404        | Status 404 == 404
============================================================
TOTAL: 15 | PASSED: 15 | FAILED: 0
============================================================
[PASS] Recommendation Connective Loop assertion PASSED: 'urgent_action' and 'POSTPONE' present in recommendation.
```

### Playwright E2E Audit (`node playwright-audit/workflow-audit.cjs`)
```text
========================================
 WORKFLOW AUDIT COMPLETE
========================================
PASS: 14 | FAIL: 0 | Console errors: 0 | Failed requests: 0
```
