import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.models import (
    AuthTokenResponse,
    FarmerProfileResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)
from app.services.auth_service import (
    auth_service,
    extract_token_from_header,
    require_authenticated_farmer,
)
from app.services.farmer_service import farmer_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication & Farmer Account"]
)


@router.post(
    "/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new farmer account and farm profile"
)
def register(req: RegisterRequest):
    """
    Registers a new farmer with account and farm details.
    Validates phone format, password confirmation, land size, and rejects duplicate mobile numbers.
    """
    return auth_service.register_farmer(req)


@router.post(
    "/login",
    response_model=AuthTokenResponse,
    summary="Log in with registered mobile number and password"
)
def login(req: LoginRequest, request: Request):
    """
    Authenticates a farmer.
    Throttles repeated failed attempts and returns signed JWT access token.
    """
    client_ip = request.client.host if request.client else "unknown"
    return auth_service.login_farmer(req, client_ip=client_ip)


@router.get(
    "/me",
    summary="Get active authenticated farmer user and profile (Session Restoration)"
)
def get_me(session: Dict[str, Any] = Depends(require_authenticated_farmer)):
    """
    Restores session on page reload using verified Bearer token.
    """
    farmer_id = session.get("farmer_id")
    profile = farmer_service.get_farmer_profile(farmer_id)
    return {
        "user": {
            "id": session.get("sub"),
            "phone": session.get("phone"),
            "name": session.get("name"),
            "farmer_id": farmer_id,
            "preferred_language": profile.get("preferred_language", "en"),
            "is_demo": session.get("is_demo", False)
        },
        "farmer": profile
    }


@router.post(
    "/logout",
    summary="Log out of the application"
)
def logout(authorization: Optional[str] = Header(None)):
    """
    Invalidates the client-side session and revokes the active Bearer token
    on the server to prevent token reuse.
    """
    token = extract_token_from_header(authorization)
    if token:
        auth_service.revoke_token(token)
    return {"status": "success", "message": "Successfully logged out and session revoked."}


@router.get(
    "/demo-profiles",
    summary="Get available demo profiles for simulator mode"
)
def get_demo_profiles():
    """Returns the four fixed demo profiles for demonstration purposes."""
    demos = []
    for f_id in ["demo_farmer_01", "demo_farmer_02", "demo_farmer_03", "demo_farmer_04"]:
        try:
            demos.append(farmer_service.get_farmer_profile(f_id))
        except Exception:
            pass
    return demos
