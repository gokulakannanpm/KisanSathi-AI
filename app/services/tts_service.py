import base64
import hashlib
import io
import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Language codes mapping for gTTS
GTTS_LANG_MAP = {
    "en": "en",
    "hi": "hi",
    "ta": "ta",
    "mr": "mr"
}


class TTSService:
    """
    Text-to-Speech (TTS) service for scheme content narration and accessibility.
    Generates audio streams (MP3), base64 encoded audio, and structured narration scripts
    optimized for rural farmers across English, Hindi, Tamil, and Marathi.
    """

    def __init__(self, cache_dir: Optional[Path] = None):
        if cache_dir is None:
            self.cache_dir = Path(__file__).resolve().parent.parent.parent / "data" / "audio_cache"
        else:
            self.cache_dir = cache_dir

        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._memory_cache: Dict[str, bytes] = {}

    def _get_cache_key(self, text: str, lang: str) -> str:
        h = hashlib.sha256(f"{lang}:{text}".encode("utf-8")).hexdigest()
        return f"{lang}_{h[:16]}.mp3"

    def build_narration_script(self, scheme_data: Dict[str, Any], language: str = "en") -> str:
        """
        Creates a clear, natural-sounding audio narration script from scheme data.
        """
        name = scheme_data.get("name", "")
        description = scheme_data.get("description", "")
        benefits = scheme_data.get("benefits", "")
        docs = scheme_data.get("required_documents", [])
        steps = scheme_data.get("application_steps", [])

        # Build language-appropriate narration
        if language == "hi":
            script_parts = [
                f"योजना का नाम: {name}।",
                f"विवरण: {description}",
                f"योजना के मुख्य लाभ: {benefits}"
            ]
            if docs:
                script_parts.append("आवश्यक दस्तावेज: " + "। ".join(docs[:3]) + "।")
            if steps:
                script_parts.append("आवेदन प्रक्रिया: " + "। ".join(steps[:2]) + "।")
            return " ".join(script_parts)

        elif language == "ta":
            script_parts = [
                f"திட்டத்தின் பெயர்: {name}.",
                f"விளக்கம்: {description}",
                f"திட்டத்தின் முக்கிய பயன்கள்: {benefits}"
            ]
            if docs:
                script_parts.append("தேவையான ஆவணங்கள்: " + ". ".join(docs[:3]) + ".")
            if steps:
                script_parts.append("விண்ணப்பிக்கும் முறை: " + ". ".join(steps[:2]) + ".")
            return " ".join(script_parts)

        elif language == "mr":
            script_parts = [
                f"योजनेचे नाव: {name}.",
                f"माहिती: {description}",
                f"मिळणारे फायदे: {benefits}"
            ]
            if docs:
                script_parts.append("आवश्यक कागदपत्रे: " + ". ".join(docs[:3]) + ".")
            if steps:
                script_parts.append("अर्ज करण्याची पद्धत: " + ". ".join(steps[:2]) + ".")
            return " ".join(script_parts)

        else:
            # English
            script_parts = [
                f"Scheme Name: {name}.",
                f"Overview: {description}",
                f"Key Benefits: {benefits}"
            ]
            if docs:
                script_parts.append("Required Documents: " + ". ".join(docs[:3]) + ".")
            if steps:
                script_parts.append("How to Apply: " + ". ".join(steps[:2]) + ".")
            return " ".join(script_parts)

    def generate_audio_bytes(self, text: str, lang: str = "en") -> Optional[bytes]:
        """
        Generates MP3 audio bytes using gTTS with caching.
        Gracefully returns None if offline or if synthesis fails.
        """
        if not text or not text.strip():
            return None

        lang_code = GTTS_LANG_MAP.get(lang.lower(), "en")
        cache_key = self._get_cache_key(text, lang_code)

        # Check memory cache
        if cache_key in self._memory_cache:
            return self._memory_cache[cache_key]

        # Check disk cache
        cache_file = self.cache_dir / cache_key
        if cache_file.exists():
            try:
                audio_bytes = cache_file.read_bytes()
                self._memory_cache[cache_key] = audio_bytes
                return audio_bytes
            except Exception as e:
                logger.warning(f"Failed to read disk audio cache: {e}")

        # Synthesize audio with gTTS
        try:
            from gtts import gTTS
            tts = gTTS(text=text, lang=lang_code, slow=False)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            audio_bytes = fp.getvalue()

            # Save to caches
            self._memory_cache[cache_key] = audio_bytes
            try:
                cache_file.write_bytes(audio_bytes)
            except Exception as e:
                logger.warning(f"Failed to write audio cache file: {e}")

            return audio_bytes
        except Exception as e:
            logger.warning(f"TTS synthesis failed for lang '{lang_code}': {e}")
            return None

    def get_scheme_audio_payload(
        self,
        scheme_data: Dict[str, Any],
        language: str = "en",
        include_base64: bool = False
    ) -> Dict[str, Any]:
        """
        Returns structured TTS accessibility payload including narration script,
        audio availability flag, and optional base64 audio.
        """
        script = self.build_narration_script(scheme_data, language=language)
        audio_bytes = self.generate_audio_bytes(script, lang=language)

        has_audio = audio_bytes is not None and len(audio_bytes) > 0
        b64_audio = None

        if has_audio and include_base64:
            b64_audio = base64.b64encode(audio_bytes).decode("utf-8")

        return {
            "scheme_id": scheme_data.get("id"),
            "language": language,
            "narration_script": script,
            "has_audio": has_audio,
            "audio_format": "audio/mpeg" if has_audio else None,
            "audio_base64": f"data:audio/mpeg;base64,{b64_audio}" if b64_audio else None,
            "web_speech_supported": True,
            "web_speech_lang": f"{language}-IN" if language in ["hi", "ta", "mr"] else "en-IN"
        }


# Singleton instance
tts_service = TTSService()
