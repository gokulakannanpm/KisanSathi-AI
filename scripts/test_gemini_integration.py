import sys
from pathlib import Path

# Ensure UTF-8 output on Windows console
sys.stdout.reconfigure(encoding='utf-8')

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    questions = [
        ("Hello", "en"),
        ("What is the best time to sow paddy?", "en"),
        ("How can I improve soil fertility?", "en"),
        ("Explain a government scheme for farmers.", "en"),
        ("What should I do if my crop leaves are turning yellow?", "en"),
        ("धान की बुवाई का सही समय क्या है?", "hi"),
        ("நெல் விதைக்க சிறந்த நேரம் எது?", "ta"),
    ]

    print("=" * 70)
    print("TESTING KISANSATHI-AI GEMINI INTEGRATION")
    print("=" * 70)

    all_passed = True

    for q, lang in questions:
        print(f"\n[QUERY ({lang})]: {q}")
        response = client.post("/api/ai/explain", json={
            "farmer_id": "demo_farmer_01",
            "question": q,
            "language": lang
        })

        if response.status_code == 200:
            data = response.json()
            provider = data.get("provider_used", "N/A")
            explanation = data.get("explanation_text", "")
            action_steps = data.get("action_steps", [])

            print(f"  Status: {response.status_code}")
            print(f"  Provider: {provider}")
            print(f"  Action Steps Count: {len(action_steps)}")
            print(f"  Response Snippet: {explanation[:180]}...")

            if "Google Gemini" not in provider:
                print("  [WARNING]: Provider is not Google Gemini (Live AI)")
                all_passed = False
            else:
                print("  [PASS]: Received live Google Gemini response.")
        else:
            print(f"  [FAIL]: Status Code {response.status_code}")
            all_passed = False

    print("\n" + "=" * 70)
    if all_passed:
        print("ALL GEMINI INTEGRATION TEST CASES PASSED SUCCESSFULLY!")
    else:
        print("SOME TESTS DID NOT USE LIVE GEMINI PROVIDER OR FAILED.")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
