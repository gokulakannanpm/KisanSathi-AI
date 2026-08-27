import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

from app.services.farmer_service import farmer_service
from app.services.scheme_engine import scheme_engine
from app.services.tts_service import tts_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/schemes",
    tags=["Government Schemes & Eligibility"]
)


# --- Response Models for Documentation & Frontend Typing ---

class LanguageOption(BaseModel):
    code: str
    name: str
    native_name: str


class SchemeResponse(BaseModel):
    id: str = Field(..., description="Unique scheme identifier")
    name: str = Field(..., description="Scheme title in the requested language")
    description: str = Field(..., description="Scheme summary in the requested language")
    benefits: str = Field(..., description="Financial or material benefits description")
    required_documents: List[str] = Field(default_factory=list, description="Flat list of required documents for clear rendering")
    application_steps: List[str] = Field(default_factory=list, description="Flat list of step-by-step application instructions")
    department: str = Field(..., description="Governing ministry or department")
    status: str = Field("active", description="Scheme operational status")
    last_updated: str = Field(..., description="Date of last information update")
    official_source: str = Field(..., description="Official government scheme information URL")
    official_application_link: str = Field(..., description="Direct government portal application URL")
    eligible: bool = Field(..., description="Computed deterministic eligibility flag for the farmer")
    eligibility_reasons: List[str] = Field(default_factory=list, description="Plain-language reasons explaining the eligibility decision")
    criteria_evaluation: Optional[Dict[str, str]] = Field(default=None, description="Detailed criteria breakdown")
    language: str = Field("en", description="Language code of the response")


class EligibilityResponse(BaseModel):
    scheme_id: str
    scheme_name: str
    eligible: bool
    reasons: List[str]
    criteria_evaluation: Dict[str, str]


class TTSAudioResponse(BaseModel):
    scheme_id: str
    language: str
    narration_script: str
    has_audio: bool
    audio_format: Optional[str]
    audio_base64: Optional[str]
    web_speech_supported: bool
    web_speech_lang: str


# --- Helper to Resolve Farmer Profile ---

def _resolve_farmer_profile(
    farmer_id: Optional[str] = None,
    land_acres: Optional[float] = None,
    crop: Optional[str] = None,
    state: Optional[str] = None,
    category: Optional[str] = None,
    owns_land: Optional[bool] = None,
    has_irrigation: Optional[bool] = None,
    is_tax_payer: Optional[bool] = None,
    age: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Resolves farmer profile context from DB (if available), demo farmer JSON,
    or directly supplied query parameters.
    """
    profile: Dict[str, Any] = {}

    # Try to load real farmer profile if farmer_id is specified
    if farmer_id:
        try:
            real_profile = farmer_service.get_farmer_profile(farmer_id)
            if real_profile:
                profile.update(real_profile)
        except Exception as e:
            logger.debug(f"Failed to fetch farmer profile for '{farmer_id}': {e}")
            demo_profile = scheme_engine.get_demo_farmer_profile()
            if demo_profile:
                profile.update(demo_profile)
        profile["id"] = farmer_id
    elif any(x is not None for x in [land_acres, crop, state, category]):
        # Farmer context constructed on-the-fly from query parameters
        profile["id"] = "custom_query_farmer"

    # Overlay any explicitly passed override query parameters (if valid types)
    if isinstance(land_acres, (int, float)):
        profile["land_size_acres"] = float(land_acres)
    if isinstance(crop, str) and crop.strip():
        profile["crops"] = [c.strip() for c in crop.split(",") if c.strip()]
    if isinstance(state, str) and state.strip():
        profile["state"] = state.strip()
    if isinstance(category, str) and category.strip():
        profile["farmer_category"] = category.strip()
    if isinstance(owns_land, bool):
        profile["owns_land"] = owns_land
    if isinstance(has_irrigation, bool):
        profile["has_irrigation"] = has_irrigation
    if isinstance(is_tax_payer, bool):
        profile["is_tax_payer"] = is_tax_payer
    if isinstance(age, int):
        profile["age"] = age

    return profile if profile else None


# --- Endpoints ---

@router.get(
    "",
    response_model=List[SchemeResponse],
    summary="Get localized schemes list with computed eligibility",
    description="Returns a list of government schemes translated into the requested language with computed deterministic eligibility for the farmer."
)
def get_schemes(
    farmer_id: Optional[str] = Query(None, description="Farmer profile ID for personalized eligibility matching"),
    language: str = Query("en", pattern="^(en|hi|ta|mr)$", description="Language code: en (English), hi (Hindi), ta (Tamil), mr (Marathi)"),
    land_acres: Optional[float] = Query(None, description="Optional landholding override in acres"),
    crop: Optional[str] = Query(None, description="Optional crop override (e.g. wheat, cotton)"),
    state: Optional[str] = Query(None, description="Optional state filter (e.g. Maharashtra, Tamil Nadu)"),
    category: Optional[str] = Query(None, description="Optional farmer category (marginal, small, medium, large)")
):
    farmer_profile = _resolve_farmer_profile(
        farmer_id=farmer_id,
        land_acres=land_acres,
        crop=crop,
        state=state,
        category=category
    )

    schemes = scheme_engine.get_schemes_list(
        farmer_profile=farmer_profile,
        language=language,
        category_filter=category,
        crop_filter=crop,
        state_filter=state
    )

    return schemes


@router.get(
    "/languages",
    response_model=List[LanguageOption],
    summary="List supported UI and audio languages",
    description="Returns available language codes and names for multilingual localization and TTS."
)
def get_supported_languages():
    return [
        LanguageOption(code="en", name="English", native_name="English"),
        LanguageOption(code="hi", name="Hindi", native_name="हिन्दी"),
        LanguageOption(code="ta", name="Tamil", native_name="தமிழ்"),
        LanguageOption(code="mr", name="Marathi", native_name="मराठी")
    ]


@router.get(
    "/{scheme_id}",
    response_model=SchemeResponse,
    summary="Get single scheme details",
    description="Returns full localized details and computed eligibility for a single scheme."
)
def get_scheme_by_id(
    scheme_id: str,
    farmer_id: Optional[str] = Query(None, description="Farmer profile ID"),
    language: str = Query("en", pattern="^(en|hi|ta|mr)$", description="Language code"),
    land_acres: Optional[float] = Query(None),
    crop: Optional[str] = Query(None),
    state: Optional[str] = Query(None)
):
    scheme = scheme_engine.get_scheme_by_id(scheme_id)
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Government scheme '{scheme_id}' not found."
        )

    farmer_profile = _resolve_farmer_profile(
        farmer_id=farmer_id,
        land_acres=land_acres,
        crop=crop,
        state=state
    )

    localized = scheme_engine.localize_scheme(
        scheme,
        language=language,
        farmer_profile=farmer_profile
    )
    return localized


@router.get(
    "/{scheme_id}/eligibility",
    response_model=EligibilityResponse,
    summary="Check deterministic scheme eligibility for a farmer",
    description="Evaluates all rule-based criteria for a specific scheme against the farmer's profile."
)
def check_scheme_eligibility(
    scheme_id: str,
    farmer_id: Optional[str] = Query(None, description="Farmer profile ID"),
    language: str = Query("en", pattern="^(en|hi|ta|mr)$", description="Language code"),
    land_acres: Optional[float] = Query(None, description="Land size in acres"),
    crop: Optional[str] = Query(None, description="Cultivated crop"),
    state: Optional[str] = Query(None, description="State of farm"),
    owns_land: Optional[bool] = Query(None, description="Whether farmer owns cultivable land"),
    has_irrigation: Optional[bool] = Query(None, description="Whether farm has assured irrigation"),
    is_tax_payer: Optional[bool] = Query(None, description="Whether farmer is an income-tax payer"),
    age: Optional[int] = Query(None, description="Farmer age")
):
    scheme = scheme_engine.get_scheme_by_id(scheme_id)
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Government scheme '{scheme_id}' not found."
        )

    farmer_profile = _resolve_farmer_profile(
        farmer_id=farmer_id,
        land_acres=land_acres,
        crop=crop,
        state=state,
        owns_land=owns_land,
        has_irrigation=has_irrigation,
        is_tax_payer=is_tax_payer,
        age=age
    )

    eval_result = scheme_engine.evaluate_eligibility(
        scheme,
        farmer_profile=farmer_profile,
        language=language
    )

    localized = scheme_engine.localize_scheme(scheme, language=language)

    return EligibilityResponse(
        scheme_id=scheme_id,
        scheme_name=localized["name"],
        eligible=eval_result["eligible"],
        reasons=eval_result["reasons"],
        criteria_evaluation=eval_result["criteria_evaluation"]
    )


@router.get(
    "/{scheme_id}/audio",
    summary="Get Text-to-Speech audio or accessibility script",
    description="Returns either direct MP3 audio stream (for playback) or structured JSON accessibility payload."
)
def get_scheme_audio(
    scheme_id: str,
    language: str = Query("en", pattern="^(en|hi|ta|mr)$", description="Language code"),
    stream: bool = Query(False, description="If true, returns raw MP3 audio stream for direct HTML5 audio player; if false, returns JSON payload")
):
    scheme = scheme_engine.get_scheme_by_id(scheme_id)
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Government scheme '{scheme_id}' not found."
        )

    localized = scheme_engine.localize_scheme(scheme, language=language)

    if stream:
        script = tts_service.build_narration_script(localized, language=language)
        audio_bytes = tts_service.generate_audio_bytes(script, lang=language)
        if audio_bytes:
            return Response(
                content=audio_bytes,
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": f'inline; filename="{scheme_id}_{language}.mp3"',
                    "Cache-Control": "public, max-age=86400"
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Audio synthesis currently unavailable for language '{language}'. Please use the web speech narration script."
            )

    # Return structured JSON accessibility payload (with embedded base64 audio if available)
    payload = tts_service.get_scheme_audio_payload(localized, language=language, include_base64=True)
    return payload
