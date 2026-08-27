import json
import urllib.error
import urllib.request

BASE_URL = "http://localhost:8000"


def make_request(url, method="GET", body=None):
    headers = {"Content-Type": "application/json"}
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.getcode()
            response_body = json.loads(resp.read().decode("utf-8"))
            return status_code, response_body
    except urllib.error.HTTPError as e:
        body_read = e.read().decode("utf-8")
        try:
            err_json = json.loads(body_read)
        except Exception:
            err_json = {"detail": body_read}
        return e.code, err_json


def run_tests():
    print("=" * 60)
    print("RUNNING KISANSATHI BACKEND VERIFICATION TESTS")
    print("=" * 60)

    tests = [
        ("Health Check", "GET", f"{BASE_URL}/api/health", None, 200),
        ("Schemes List", "GET", f"{BASE_URL}/api/schemes?farmer_id=demo_farmer_01&language=en", None, 200),
        ("Farmer Profile", "GET", f"{BASE_URL}/api/farmer/demo_farmer_01/profile", None, 200),
        ("Farmer Diary", "GET", f"{BASE_URL}/api/farmer/demo_farmer_01/diary", None, 200),
        (
            "Add Diary Entry", "POST", f"{BASE_URL}/api/farmer/demo_farmer_01/diary",
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
        ("Current Weather", "GET", f"{BASE_URL}/api/weather/current?farmer_id=demo_farmer_01", None, 200),
        ("Mandi Prices (All)", "GET", f"{BASE_URL}/api/mandi/price", None, 200),
        ("Mandi Prices (Filtered)", "GET", f"{BASE_URL}/api/mandi/price?crop=cotton", None, 200),
        ("Recommendation Engine", "GET", f"{BASE_URL}/api/recommendation/demo_farmer_01", None, 200),
        (
            "AI Explainer", "POST", f"{BASE_URL}/api/ai/explain",
            {"farmer_id": "demo_farmer_01"}, 200
        ),
        ("Unknown Farmer 404", "GET", f"{BASE_URL}/api/farmer/unknown_farmer_123/profile", None, 404),
        ("Unknown Scheme 404", "GET", f"{BASE_URL}/api/schemes/unknown_scheme_123/eligibility", None, 404)
    ]

    passed = 0
    failed = 0

    for title, method, url, body, expected_code in tests:
        code, res = make_request(url, method, body)
        if code == expected_code:
            print(f"✓ PASS | {title:<25} | Status {code} == {expected_code}")
            passed += 1
        else:
            print(f"✗ FAIL | {title:<25} | Status {code} != {expected_code} | Response: {res}")
            failed += 1

    print("=" * 60)
    print(f"TOTAL: {len(tests)} | PASSED: {passed} | FAILED: {failed}")
    print("=" * 60)

    if failed > 0:
        exit(1)


if __name__ == "__main__":
    run_tests()
