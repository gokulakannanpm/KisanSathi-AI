import logging
from typing import List
from fastapi import APIRouter, status
from app.models import DiaryEntryCreate, DiaryEntryResponse, FarmerProfileResponse
from app.services.farmer_service import farmer_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/farmer",
    tags=["Farmer Profile & Diary"]
)


@router.get(
    "/{farmer_id}/profile",
    response_model=FarmerProfileResponse,
    summary="Get farmer profile by ID"
)
def get_profile(farmer_id: str):
    return farmer_service.get_farmer_profile(farmer_id)


@router.get(
    "/{farmer_id}/diary",
    response_model=List[DiaryEntryResponse],
    summary="Get farmer diary entries"
)
def get_diary(farmer_id: str):
    return farmer_service.get_diary_entries(farmer_id)


@router.post(
    "/{farmer_id}/diary",
    response_model=DiaryEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new diary entry for farmer"
)
def add_diary(farmer_id: str, entry: DiaryEntryCreate):
    return farmer_service.add_diary_entry(farmer_id, entry.model_dump())
