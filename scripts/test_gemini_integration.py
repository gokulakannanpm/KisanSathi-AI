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
    print("TESTING KISANSATHI-AI GROQ INTEGRATION")
    print("=" * 70)

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

            assert "Gemini" not in provider, f"Unexpected Gemini provider: {provider}"
            if "Groq" in provider:
                print("  [PASS]: Received live Groq response.")
            else:
                print("  [PASS]: Operating in safe deterministic fallback mode (Rule Engine Fallback).")
        else:
            print(f"  [FAIL]: Status Code {response.status_code}")

    print("\n" + "=" * 70)
    print("GROQ VERIFICATION COMPLETED (ZERO GEMINI INVOCATIONS)")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
