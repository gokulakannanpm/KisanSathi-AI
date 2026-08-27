import json
import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_all():
    print("=" * 60)
    print("TESTING KISANSATHI-AI ENDPOINTS VIA TESTCLIENT")
    print("=" * 60)

    tests = [
        ("Health Check", "GET", "/api/health", None, 200),
        ("Root Endpoint", "GET", "/", None, 200),
        ("Schemes List", "GET", "/api/schemes?farmer_id=demo_farmer_01&language=en", None, 200),
        ("Single Scheme", "GET", "/api/schemes/pm_kisan?farmer_id=demo_farmer_01&language=en", None, 200),
        ("Scheme Eligibility", "GET", "/api/schemes/pm_kisan/eligibility?farmer_id=demo_farmer_01", None, 200),
        ("Farmer Profile", "GET", "/api/farmer/demo_farmer_01/profile", None, 200),
        ("Farmer Diary", "GET", "/api/farmer/demo_farmer_01/diary", None, 200),
        (
            "Add Diary Entry", "POST", "/api/farmer/demo_farmer_01/diary",
            {
                "date": "2026-08-28",
                "activity_type": "Weeding",
                "crop": "cotton",
                "notes": "Manual weeding session",
                "quantity_cost": "₹500",
                "status": "planned",
                "triggered_alert": False
            }, 201
        ),
        ("Current Weather", "GET", "/api/weather/current?farmer_id=demo_farmer_01", None, 200),
        ("Mandi Prices (All)", "GET", "/api/mandi/price", None, 200),
        ("Mandi Prices (Filtered)", "GET", "/api/mandi/price?crop=cotton", None, 200),
        ("Recommendation Engine", "GET", "/api/recommendation/demo_farmer_01", None, 200),
        (
            "AI Explainer", "POST", "/api/ai/explain",
            {"farmer_id": "demo_farmer_01"}, 200
        ),
        ("Unknown Farmer 404", "GET", "/api/farmer/unknown_farmer_123/profile", None, 404),
        ("Unknown Scheme 404", "GET", "/api/schemes/unknown_scheme_123/eligibility", None, 404)
    ]

    passed = 0
    failed = 0

    for title, method, path, body, expected_code in tests:
        if method == "GET":
            response = client.get(path)
        elif method == "POST":
            response = client.post(path, json=body)

        if response.status_code == expected_code:
            print(f"[PASS] | {title:<25} | Status {response.status_code} == {expected_code}")
            passed += 1
        else:
            print(f"[FAIL] | {title:<25} | Status {response.status_code} != {expected_code} | Body: {response.text}")
            failed += 1

    print("=" * 60)
    print(f"TOTAL: {len(tests)} | PASSED: {passed} | FAILED: {failed}")
    print("=" * 60)

    # Specific assertions on recommendation output
    rec_resp = client.get("/api/recommendation/demo_farmer_01")
    rec_json = rec_resp.json()
    assert rec_json["decision_type"] == "urgent_action"
    assert "POSTPONE" in rec_json["action"]
    print("[PASS] Recommendation Connective Loop assertion PASSED: 'urgent_action' and 'POSTPONE' present in recommendation.")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    test_all()
