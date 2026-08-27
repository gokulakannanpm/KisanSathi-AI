import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from pydantic import BaseModel, Field

# SQLite Database Engine
DATABASE_URL = "sqlite:///./kisansathi.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# --- SQLAlchemy Models ---

class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    state = Column(String, nullable=False)
    district = Column(String, nullable=False)
    taluka = Column(String, nullable=True)
    village = Column(String, nullable=True)
    land_size_acres = Column(Float, nullable=False, default=2.5)
    farmer_category = Column(String, nullable=False, default="small")
    crops = Column(String, nullable=False, default="[]")  # Stored as JSON string
    soil_type = Column(String, nullable=True)
    owns_land = Column(Boolean, nullable=False, default=True)
    has_irrigation = Column(Boolean, nullable=False, default=True)
    irrigation_type = Column(String, nullable=True)
    is_tax_payer = Column(Boolean, nullable=False, default=False)
    age = Column(Integer, nullable=False, default=42)
    pm_kisan_registered = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    diary_entries = relationship("DiaryEntry", back_populates="farmer", cascade="all, delete-orphan")
    acknowledgements = relationship("ActionAcknowledgement", back_populates="farmer", cascade="all, delete-orphan")

    def get_crops_list(self) -> List[str]:
        try:
            return json.loads(self.crops)
        except Exception:
            return []

    def set_crops_list(self, crops_list: List[str]) -> None:
        self.crops = json.dumps(crops_list)


class DiaryEntry(Base):
    __tablename__ = "diary_entries"

    id = Column(String, primary_key=True, index=True)
    farmer_id = Column(String, ForeignKey("farmers.id"), nullable=False, index=True)
    date = Column(String, nullable=False)  # YYYY-MM-DD format
    activity_type = Column(String, nullable=False)
    crop = Column(String, nullable=False)
    notes = Column(String, nullable=False)
    quantity_cost = Column(String, nullable=False)
    status = Column(String, nullable=False, default="planned")
    triggered_alert = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    farmer = relationship("Farmer", back_populates="diary_entries")


class ActionAcknowledgement(Base):
    __tablename__ = "action_acknowledgements"

    id = Column(String, primary_key=True, index=True)
    farmer_id = Column(String, ForeignKey("farmers.id"), nullable=False, index=True)
    action_key = Column(String, nullable=False)
    status = Column(String, nullable=False, default="postponed")
    postponed_to_date = Column(String, nullable=True)
    acknowledged_at = Column(DateTime, default=datetime.utcnow)

    farmer = relationship("Farmer", back_populates="acknowledgements")


# --- Pydantic Schemas ---

class FarmerProfileResponse(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    state: str
    district: str
    taluka: Optional[str] = None
    village: Optional[str] = None
    land_size_acres: float
    farmer_category: str
    crops: List[str]
    soil_type: Optional[str] = None
    owns_land: bool
    has_irrigation: bool
    irrigation_type: Optional[str] = None
    is_tax_payer: bool
    age: int
    pm_kisan_registered: bool

    model_config = {"from_attributes": True}


class DiaryEntryResponse(BaseModel):
    id: str
    date: str
    activity_type: str
    crop: str
    notes: str
    quantity_cost: str
    status: str
    triggered_alert: bool

    model_config = {"from_attributes": True}


class DiaryEntryCreate(BaseModel):
    date: str
    activity_type: str
    crop: str
    notes: str
    quantity_cost: str
    status: Optional[str] = "planned"
    triggered_alert: Optional[bool] = False
