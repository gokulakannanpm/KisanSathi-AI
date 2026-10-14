import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status

from app.models import (
    DiaryEntryCreate,
    DiaryEntryResponse,
    FarmerProfileResponse,
    FarmerProfileUpdate,
)
from app.services.auth_service import (
    extract_token_from_header,
    get_current_farmer_context,
    require_authenticated_farmer,
    verify_farmer_access,
)
from app.services.farmer_service import farmer_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/farmer",
    tags=["Farmer Profile & Diary"]
)

# Centralized IDOR authorization check
_verify_farmer_access = verify_farmer_access


# --- Profile Endpoints ---

@router.get(
    "/profile",
    response_model=FarmerProfileResponse,
    summary="Get active farmer profile (Session-derived or Demo query)"
)
def get_current_profile(
    farmer_id: Optional[str] = Query(None, description="Optional demo farmer ID if in demo mode"),
    session: Optional[Dict[str, Any]] = Depends(get_current_farmer_context)
):
    """
    Returns the authenticated farmer's profile, or demo profile if unauthenticated.
    Server-side authentication context takes priority over client-supplied IDs.
    """
    if session:
        target_id = session.get("farmer_id")
    elif farmer_id and farmer_id in farmer_service.DEFAULT_TEMPLATES:
        target_id = farmer_id
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access farmer profile.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return farmer_service.get_farmer_profile(target_id)


@router.put(
    "/profile",
    response_model=FarmerProfileResponse,
    summary="Update authenticated farmer's profile"
)
def update_current_profile(
    updates: FarmerProfileUpdate,
    session: Dict[str, Any] = Depends(require_authenticated_farmer)
):
    """
    Updates the authenticated farmer's personal and farm details.
    Identity is strictly derived from the server-side JWT session.
    """
    farmer_id = session.get("farmer_id")
    return farmer_service.update_farmer_profile(
        farmer_id,
        updates.model_dump(exclude_unset=True)
    )


@router.get(
    "/{farmer_id}/profile",
    response_model=FarmerProfileResponse,
    summary="Get farmer profile by ID (With IDOR Authorization Check)"
)
def get_profile(
    farmer_id: str,
    session: Optional[Dict[str, Any]] = Depends(get_current_farmer_context)
):
    target_id = _verify_farmer_access(farmer_id, session)
    return farmer_service.get_farmer_profile(target_id)


@router.put(
    "/{farmer_id}/profile",
    response_model=FarmerProfileResponse,
    summary="Update farmer profile by ID (With IDOR Authorization Check)"
)
def update_profile(
    farmer_id: str,
    updates: FarmerProfileUpdate,
    session: Optional[Dict[str, Any]] = Depends(get_current_farmer_context)
):
    target_id = _verify_farmer_access(farmer_id, session)
    return farmer_service.update_farmer_profile(
        target_id,
        updates.model_dump(exclude_unset=True)
    )


# --- Diary Endpoints ---

@router.get(
    "/diary",
    response_model=List[DiaryEntryResponse],
    summary="Get active farmer diary entries (Session-derived or Demo query)"
)
def get_current_diary(
    farmer_id: Optional[str] = Query(None, description="Optional demo farmer ID if in demo mode"),
    session: Optional[Dict[str, Any]] = Depends(get_current_farmer_context)
):
    if session:
        target_id = session.get("farmer_id")
    elif farmer_id and farmer_id in farmer_service.DEFAULT_TEMPLATES:
        target_id = farmer_id
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access farmer diary.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return farmer_service.get_diary_entries(target_id)


@router.post(
    "/diary",
    response_model=DiaryEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new diary entry for active farmer"
)
def add_current_diary(
    entry: DiaryEntryCreate,
    farmer_id: Optional[str] = Query(None, description="Optional demo farmer ID if in demo mode"),
    session: Optional[Dict[str, Any]] = Depends(get_current_farmer_context)
):
    if session:
        target_id = session.get("farmer_id")
    elif farmer_id and farmer_id in farmer_service.DEFAULT_TEMPLATES:
        target_id = farmer_id
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to add diary entries.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return farmer_service.add_diary_entry(target_id, entry.model_dump())


@router.get(
    "/{farmer_id}/diary",
    response_model=List[DiaryEntryResponse],
    summary="Get farmer diary entries by ID (With IDOR Authorization Check)"
)
def get_diary(
    farmer_id: str,
    session: Optional[Dict[str, Any]] = Depends(get_current_farmer_context)
):
    target_id = _verify_farmer_access(farmer_id, session)
    return farmer_service.get_diary_entries(target_id)


@router.post(
    "/{farmer_id}/diary",
    response_model=DiaryEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new diary entry for farmer (With IDOR Authorization Check)"
)
def add_diary(
    farmer_id: str,
    entry: DiaryEntryCreate,
    session: Optional[Dict[str, Any]] = Depends(get_current_farmer_context)
):
    target_id = _verify_farmer_access(farmer_id, session)
    return farmer_service.add_diary_entry(target_id, entry.model_dump())
