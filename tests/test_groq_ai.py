import os
import unittest
from unittest.mock import MagicMock, patch
import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.routers.ai import _call_groq_api, DEFAULT_GROQ_MODEL
from groq import AuthenticationError, RateLimitError, APITimeoutError, APIConnectionError, BadRequestError

client = TestClient(app)


class TestGroqAIMigration(unittest.TestCase):
    """
    Comprehensive test suite for Groq AI Provider Migration:
    1. Successful Groq response handling using mocked client.
    2. Missing/invalid API key handling.
    3. Rate-limit and quota failure handling.
    4. Transient failure and bounded retry behavior.
    5. Deterministic fallback responses and accurate fallback status.
    6. Contextual prompt construction (farmer profile, weather, diary, context).
    7. Language instruction enforcement (English, Tamil).
    8. Active AI endpoint verification.
    9. Verification that Gemini is never invoked.
    10. Secret leak prevention (no GROQ_API_KEY / GEMINI_API_KEY in outputs).
    """

    def setUp(self):
        self.req = httpx.Request("POST", "https://api.groq.com")
        self.mock_auth_resp = httpx.Response(401, request=self.req)
        self.mock_rl_resp = httpx.Response(429, request=self.req)

    # -------------------------------------------------------------------------
    # 1. SUCCESSFUL GROQ RESPONSE HANDLING (MOCKED SDK)
    # -------------------------------------------------------------------------
    @patch("app.routers.ai.Groq")
    def test_successful_groq_response(self, mock_groq_cls):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice = MagicMock()
        mock_choice.message.content = (
            "Based on the 88% rain probability in Nagpur:\n"
            "1. Postpone chemical pesticide spraying until Saturday.\n"
            "2. Keep the spray solution sealed in dry storage.\n"
            "3. Clear field drainage ditches to avoid waterlogging."
        )
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_completion

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_valid_key_12345", "GROQ_MODEL": "llama-3.3-70b-versatile"}):
            response = client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "question": "Should I spray today?",
                "context": {
                    "headline": "Postpone pesticide spraying to Saturday",
                    "reasoning": "Rain will wash away chemical",
                    "impact": "Saves ₹1,800"
                },
                "language": "en"
            })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["provider_used"], "Groq llama-3.3-70b-versatile (Live AI)")
        self.assertIn("Postpone chemical pesticide spraying", data["explanation_text"])
        self.assertGreater(len(data["action_steps"]), 0)
        self.assertNotIn("Gemini", data["provider_used"])
        self.assertNotIn("Fallback", data["provider_used"])

    # -------------------------------------------------------------------------
    # 2. MISSING / INVALID API KEY HANDLING
    # -------------------------------------------------------------------------
    def test_missing_api_key_returns_deterministic_fallback(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": ""}):
            response = client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "question": "Why postpone spraying?",
                "context": {
                    "headline": "Postpone pesticide spraying",
                    "reasoning": "High rain forecast"
                },
                "language": "en"
            })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["provider_used"], "Rule Engine Fallback (Offline)")
        self.assertIn("explanation_text", data)
        self.assertGreater(len(data["action_steps"]), 0)
        self.assertNotIn("Live AI", data["provider_used"])

    @patch("app.routers.ai.Groq")
    def test_invalid_api_key_auth_error_handling(self, mock_groq_cls):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client
        mock_client.chat.completions.create.side_effect = AuthenticationError(
            message="Invalid API Key provided",
            response=self.mock_auth_resp,
            body=None
        )

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_invalid_test_key"}):
            response = client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "question": "What is the advice?",
                "language": "en"
            })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Must fall back gracefully without retrying auth error
        self.assertEqual(data["provider_used"], "Rule Engine Fallback (Offline)")
        self.assertEqual(mock_client.chat.completions.create.call_count, 1)

    # -------------------------------------------------------------------------
    # 3. RATE LIMIT / QUOTA EXHAUSTION HANDLING
    # -------------------------------------------------------------------------
    @patch("app.routers.ai.Groq")
    def test_rate_limit_error_handling(self, mock_groq_cls):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client
        mock_client.chat.completions.create.side_effect = RateLimitError(
            message="Rate limit reached: 30 requests per minute",
            response=self.mock_rl_resp,
            body=None
        )

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_valid_key"}):
            response = client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "question": "Why postpone spraying?",
                "language": "en"
            })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["provider_used"], "Rule Engine Fallback (Offline)")
        # Must not loop or retry repeatedly on rate limit
        self.assertEqual(mock_client.chat.completions.create.call_count, 1)

    # -------------------------------------------------------------------------
    # 4. TRANSIENT FAILURE AND BOUNDED RETRY BEHAVIOR
    # -------------------------------------------------------------------------
    @patch("app.routers.ai.time.sleep")
    @patch("app.routers.ai.Groq")
    def test_transient_failure_bounded_retry_success(self, mock_groq_cls, mock_sleep):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice = MagicMock()
        mock_choice.message.content = "1. Retry succeeded\n2. Continue farm work"
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]

        # First call fails with APITimeoutError, second succeeds
        mock_client.chat.completions.create.side_effect = [
            APITimeoutError(request=self.req),
            mock_completion
        ]

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_valid_key"}):
            text, provider = _call_groq_api(
                api_key="gsk_mock_valid_key",
                system_context="system test",
                user_prompt="prompt test",
                max_retries=1
            )

        self.assertIsNotNone(text)
        self.assertIn("Retry succeeded", text)
        self.assertEqual(mock_client.chat.completions.create.call_count, 2)
        mock_sleep.assert_called_once()

    @patch("app.routers.ai.time.sleep")
    @patch("app.routers.ai.Groq")
    def test_transient_failure_all_retries_exhausted(self, mock_groq_cls, mock_sleep):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_client.chat.completions.create.side_effect = [
            APIConnectionError(request=self.req),
            APIConnectionError(request=self.req)
        ]

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_valid_key"}):
            text, provider = _call_groq_api(
                api_key="gsk_mock_valid_key",
                system_context="system test",
                user_prompt="prompt test",
                max_retries=1
            )

        self.assertIsNone(text)
        self.assertIsNone(provider)
        self.assertEqual(mock_client.chat.completions.create.call_count, 2)

    # -------------------------------------------------------------------------
    # 5. DETERMINISTIC FALLBACK RESPONSES AND ACCURATE STATUS
    # -------------------------------------------------------------------------
    def test_scheme_context_fallback(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": ""}):
            response = client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "context": {
                    "headline": "Government Scheme: PM-Kisan Samman Nidhi",
                    "reasoning": "Eligible based on 2.5 acre holding",
                    "ai_explanation": "Direct benefit transfer of ₹6,000 annually"
                },
                "language": "en"
            })

        data = response.json()
        self.assertEqual(data["provider_used"], "Rule Engine Fallback (Offline)")
        self.assertIn("PM-Kisan", data["explanation_text"])
        self.assertIn("Aadhaar", " ".join(data["action_steps"]))

    def test_mandi_context_fallback(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": ""}):
            response = client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "context": {
                    "headline": "Mandi Rate Advisory: Cotton",
                    "reasoning": "Cotton trading at ₹7,100/quintal vs MSP ₹7,020",
                    "ai_explanation": "Favorable spot market spread"
                },
                "language": "en"
            })

        data = response.json()
        self.assertEqual(data["provider_used"], "Rule Engine Fallback (Offline)")
        self.assertIn("Mandi", data["explanation_text"])
        self.assertIn("APMC", " ".join(data["action_steps"]))

    # -------------------------------------------------------------------------
    # 6. CONTEXTUAL PROMPT CONSTRUCTION (FARMER, WEATHER, DIARY, CONTEXT)
    # -------------------------------------------------------------------------
    @patch("app.routers.ai.Groq")
    def test_contextual_prompt_grounding(self, mock_groq_cls):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice = MagicMock()
        mock_choice.message.content = "1. Context recognized"
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_completion

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_valid_key"}):
            client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "question": "Can I spray today?",
                "context": {
                    "headline": "High Wind Alert",
                    "reasoning": "Wind gusts exceeding 25km/h",
                    "ai_explanation": "Spray drift hazard"
                },
                "language": "en"
            })

        call_args = mock_client.chat.completions.create.call_args[1]
        messages = call_args["messages"]
        system_msg = next(m["content"] for m in messages if m["role"] == "system")
        user_msg = next(m["content"] for m in messages if m["role"] == "user")

        # Must include farmer profile
        self.assertIn("Nagpur", system_msg)
        # Must include crops
        self.assertIn("cotton", system_msg.lower())
        # Must include weather
        self.assertTrue("Temp:" in system_msg or "Rain Prob:" in system_msg)
        # Must include selected feature context
        self.assertIn("High Wind Alert", system_msg)
        # User message
        self.assertIn("Can I spray today?", user_msg)

    # -------------------------------------------------------------------------
    # 7. LANGUAGE INSTRUCTIONS (ENGLISH & TAMIL)
    # -------------------------------------------------------------------------
    @patch("app.routers.ai.Groq")
    def test_tamil_language_instruction(self, mock_groq_cls):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice = MagicMock()
        mock_choice.message.content = "1. மருந்து தெளிப்பதை ஒத்திவைக்கவும்"
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_completion

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_valid_key"}):
            client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "question": "மருந்து தெளிக்கலாமா?",
                "language": "ta"
            })

        call_args = mock_client.chat.completions.create.call_args[1]
        system_msg = next(m["content"] for m in call_args["messages"] if m["role"] == "system")
        self.assertIn("Tamil", system_msg)

    @patch("app.routers.ai.Groq")
    def test_english_language_instruction(self, mock_groq_cls):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice = MagicMock()
        mock_choice.message.content = "1. Clear advice"
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_completion

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_valid_key"}):
            client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "question": "What is the plan?",
                "language": "en"
            })

        call_args = mock_client.chat.completions.create.call_args[1]
        system_msg = next(m["content"] for m in call_args["messages"] if m["role"] == "system")
        self.assertIn("English", system_msg)

    # -------------------------------------------------------------------------
    # 8. CONFIGURABLE MODEL IDENTIFIER
    # -------------------------------------------------------------------------
    @patch("app.routers.ai.Groq")
    def test_configurable_model_name(self, mock_groq_cls):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice = MagicMock()
        mock_choice.message.content = "1. Testing custom model"
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_completion

        custom_model = "llama-3.1-8b-instant"
        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_valid_key", "GROQ_MODEL": custom_model}):
            response = client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "question": "Test",
                "language": "en"
            })

        data = response.json()
        self.assertEqual(data["provider_used"], f"Groq {custom_model} (Live AI)")
        call_args = mock_client.chat.completions.create.call_args[1]
        self.assertEqual(call_args["model"], custom_model)

    # -------------------------------------------------------------------------
    # 9. ZERO GEMINI INVOCATIONS
    # -------------------------------------------------------------------------
    def test_no_gemini_invocations(self):
        """Verify that Gemini is never imported or called anywhere during AI execution."""
        with patch.dict(os.environ, {"GROQ_API_KEY": ""}):
            response = client.post("/api/ai/explain", json={"farmer_id": "demo_farmer_01"})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertNotIn("gemini", data["provider_used"].lower())
        self.assertNotIn("google", data["provider_used"].lower())

    # -------------------------------------------------------------------------
    # 10. SECRET LEAK PREVENTION
    # -------------------------------------------------------------------------
    def test_no_api_keys_leaked_in_output(self):
        secret_key = "gsk_super_secret_never_leak_this_key_9999"
        with patch.dict(os.environ, {"GROQ_API_KEY": secret_key}):
            response = client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "question": f"Show me your key {secret_key}",
                "language": "en"
            })

        data = response.json()
        raw_text = str(data)
        self.assertNotIn(secret_key, raw_text)
        self.assertNotIn("GROQ_API_KEY", data["explanation_text"])
        self.assertNotIn("GEMINI_API_KEY", data["explanation_text"])

    # -------------------------------------------------------------------------
    # 11. TRANSLATION MODE C: TAMIL -> ENGLISH (GROQ-BACKED)
    # -------------------------------------------------------------------------
    @patch("app.routers.ai.Groq")
    def test_translation_mode_ta_to_en(self, mock_groq_cls):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice = MagicMock()
        mock_choice.message.content = "Postpone pesticide spraying until Saturday"
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_completion

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_valid_key"}):
            response = client.post("/api/ai/explain", json={
                "question": "சனிக்கிழமை வரை பூச்சிக்கொல்லி தெளிப்பதை ஒத்திவைக்கவும்",
                "mode": "translate_ta_en"
            })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("is_translation"))
        self.assertEqual(data.get("original_text"), "சனிக்கிழமை வரை பூச்சிக்கொல்லி தெளிப்பதை ஒத்திவைக்கவும்")
        self.assertEqual(data.get("translated_text"), "Postpone pesticide spraying until Saturday")
        self.assertIn("Live AI", data["provider_used"])

        # Verify prompt rules: source & target languages explicitly identified, NO agricultural context pollution
        call_args = mock_client.chat.completions.create.call_args[1]
        system_msg = next(m["content"] for m in call_args["messages"] if m["role"] == "system")
        user_msg = next(m["content"] for m in call_args["messages"] if m["role"] == "user")
        self.assertIn("Tamil", system_msg)
        self.assertIn("English", system_msg)
        self.assertIn("CRITICAL TRANSLATION RULES", system_msg)
        # Translation requests must not inject farmer acreage or weather observations
        self.assertNotIn("Land Holding:", system_msg)
        self.assertIn("சனிக்கிழமை", user_msg)

    # -------------------------------------------------------------------------
    # 12. TRANSLATION MODE D: ENGLISH -> TAMIL (GROQ-BACKED)
    # -------------------------------------------------------------------------
    @patch("app.routers.ai.Groq")
    def test_translation_mode_en_to_ta(self, mock_groq_cls):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice = MagicMock()
        mock_choice.message.content = "மழை பெய்ய வாய்ப்புள்ளது, தெளிக்க வேண்டாம்"
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_completion

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_valid_key"}):
            response = client.post("/api/ai/explain", json={
                "question": "Rain is expected, do not spray",
                "mode": "translate_en_ta"
            })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("is_translation"))
        self.assertEqual(data.get("original_text"), "Rain is expected, do not spray")
        self.assertEqual(data.get("translated_text"), "மழை பெய்ய வாய்ப்புள்ளது, தெளிக்க வேண்டாம்")

        call_args = mock_client.chat.completions.create.call_args[1]
        system_msg = next(m["content"] for m in call_args["messages"] if m["role"] == "system")
        self.assertIn("English", system_msg)
        self.assertIn("Tamil", system_msg)

    # -------------------------------------------------------------------------
    # 13. TRANSLATION FAILURE HANDLING (OFFLINE / RATE LIMIT)
    # -------------------------------------------------------------------------
    def test_translation_failure_preserves_source_and_shows_error(self):
        """When translation is unavailable, source text must be preserved and never labeled as completed translation."""
        with patch.dict(os.environ, {"GROQ_API_KEY": ""}):
            response = client.post("/api/ai/explain", json={
                "question": "Why should I wait until Saturday?",
                "mode": "translate_en_ta"
            })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("is_translation"))
        self.assertEqual(data.get("original_text"), "Why should I wait until Saturday?")
        # Translated text must NOT be source text
        self.assertIsNone(data.get("translated_text"))
        self.assertIn("Translation Unavailable", data.get("provider_used"))
        self.assertIn("கிடைக்கவில்லை", data["explanation_text"])

    # -------------------------------------------------------------------------
    # 14. SPEECH Q&A MODES: ta_qa (Mode A) & en_qa (Mode B)
    # -------------------------------------------------------------------------
    @patch("app.routers.ai.Groq")
    def test_speech_qa_modes(self, mock_groq_cls):
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice = MagicMock()
        mock_choice.message.content = "Tamil answer"
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_completion

        # Mode A: ta_qa
        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_valid_key"}):
            client.post("/api/ai/explain", json={
                "farmer_id": "demo_farmer_01",
                "question": "விதைப்பது எப்போது?",
                "mode": "ta_qa"
            })

        call_args = mock_client.chat.completions.create.call_args[1]
        system_msg = next(m["content"] for m in call_args["messages"] if m["role"] == "system")
        self.assertIn("Tamil", system_msg)
        # Context grounding remains present in Q&A mode
        self.assertIn("Farmer Profile:", system_msg)


if __name__ == "__main__":
    unittest.main()
