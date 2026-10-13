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

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    preferred_language = Column(String, nullable=False, default="en")
    farmer_id = Column(String, ForeignKey("farmers.id"), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    farmer = relationship("Farmer", back_populates="user")


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
    preferred_language = Column(String, nullable=False, default="en")
    is_demo = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="farmer", uselist=False, cascade="all, delete-orphan")
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


# --- Database Schema Migration Helper ---

def init_db():
    """Initializes tables and safely adds new columns to SQLite without data loss."""
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            result = conn.exec_driver_sql("PRAGMA table_info(farmers)").fetchall()
            existing_cols = [row[1] for row in result]
            if "preferred_language" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE farmers ADD COLUMN preferred_language VARCHAR DEFAULT 'en'")
            if "is_demo" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE farmers ADD COLUMN is_demo BOOLEAN DEFAULT 0")
            conn.exec_driver_sql("UPDATE farmers SET is_demo = 1 WHERE id LIKE 'demo_%'")
            conn.commit()
    except Exception:
        pass


# Run DB initialization on import
init_db()


# --- Pydantic Schemas ---

class UserResponse(BaseModel):
    id: str
    phone: str
    name: str
    preferred_language: str
    farmer_id: str
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


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
    preferred_language: Optional[str] = "en"
    is_demo: Optional[bool] = False

    model_config = {"from_attributes": True}


class FarmerProfileUpdate(BaseModel):
    name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    taluka: Optional[str] = None
    village: Optional[str] = None
    land_size_acres: Optional[float] = None
    crops: Optional[List[str]] = None
    soil_type: Optional[str] = None
    owns_land: Optional[bool] = None
    has_irrigation: Optional[bool] = None
    irrigation_type: Optional[str] = None
    preferred_language: Optional[str] = None
    age: Optional[int] = None


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=6, max_length=100)
    confirm_password: str = Field(..., min_length=6, max_length=100)
    state: str = Field(..., min_length=2)
    district: str = Field(..., min_length=2)
    taluka: Optional[str] = None
    village: Optional[str] = None
    preferred_language: Optional[str] = "en"
    land_size_acres: float = Field(..., gt=0, le=1000)
    owns_land: Optional[bool] = True
    crops: Optional[List[str]] = []
    has_irrigation: Optional[bool] = True
    irrigation_type: Optional[str] = None
    soil_type: Optional[str] = None
    age: Optional[int] = 40


class LoginRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=1)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    farmer: FarmerProfileResponse


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
