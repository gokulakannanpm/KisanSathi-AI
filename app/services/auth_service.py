import json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import bcrypt
import jwt
from fastapi import Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.models import (
    Farmer,
    LoginRequest,
    RegisterRequest,
    SessionLocal,
    User,
)
from app.services.farmer_service import farmer_service

logger = logging.getLogger(__name__)

# Security & Session Settings
JWT_SECRET = os.getenv("SECRET_KEY", "kisansathi-secure-farmer-jwt-secret-key-2026-prod-env")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Login Throttling (Protection against brute force / credential stuffing)
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 300  # 5 minutes


class LoginThrottler:
    """In-memory rate limiter tracking failed login attempts per mobile number/IP."""

    def __init__(self):
        self.attempts: Dict[str, List[float]] = {}

    def is_throttled(self, key: str) -> bool:
        now = time.time()
        # Filter timestamps within window
        valid_timestamps = [t for t in self.attempts.get(key, []) if now - t < LOCKOUT_WINDOW_SECONDS]
        self.attempts[key] = valid_timestamps
        return len(valid_timestamps) >= MAX_FAILED_ATTEMPTS

    def record_failure(self, key: str):
        now = time.time()
        if key not in self.attempts:
            self.attempts[key] = []
        self.attempts[key].append(now)

    def record_success(self, key: str):
        self.attempts.pop(key, None)

    def reset_all(self):
        self.attempts.clear()


throttler = LoginThrottler()


class AuthService:
    """Service handling farmer registration, secure password hashing, JWT sessions, and authorization."""

    @staticmethod
    def normalize_phone(phone: str) -> str:
        """
        Normalizes mobile number to 10-digit Indian standard (+91XXXXXXXXXX).
        Rejects non-numeric or invalid mobile numbers.
        """
        if not phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile number is required."
            )
        
        # Remove whitespace, hyphens, parentheses, plus
        cleaned = re.sub(r"[^\d]", "", phone.strip())
        
        # If starts with 91 and has 12 digits, strip country code
        if cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
        elif cleaned.startswith("0") and len(cleaned) == 11:
            cleaned = cleaned[1:]

        # Must be exactly 10 digits starting with 6, 7, 8, or 9
        if len(cleaned) != 10 or cleaned[0] not in "6789":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid 10-digit Indian mobile number."
            )

        return f"+91{cleaned}"

    @staticmethod
    def hash_password(password: str) -> str:
        """Hashes password with bcrypt and a cryptographically secure salt."""
        if not password or len(password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long."
            )
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Safely verifies plain-text password against bcrypt hash in constant time."""
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False

    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Generates a signed short-lived JWT token."""
        to_encode = data.copy()
        now = datetime.now(timezone.utc)
        expire = now + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
        to_encode.update({
            "exp": expire,
            "iat": now
        })
        return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

    @staticmethod
    def decode_access_token(token: str) -> Dict[str, Any]:
        """Decodes and validates a JWT token."""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session token. Please log in.",
                headers={"WWW-Authenticate": "Bearer"}
            )

    def register_farmer(self, req: RegisterRequest) -> Dict[str, Any]:
        """
        Registers a new farmer account and creates persistent profile.
        Rejects duplicates and invalid parameters.
        """
        # 1. Validation checks
        if req.password != req.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password and confirm password do not match."
            )

        if req.land_size_acres <= 0 or req.land_size_acres > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Land size must be a positive number up to 1000 acres."
            )

        normalized_phone = self.normalize_phone(req.phone)
        pref_lang = req.preferred_language or "en"
        if pref_lang not in ["en", "ta", "hi", "mr"]:
            pref_lang = "en"

        db: Session = SessionLocal()
        try:
            # 2. Check for duplicate mobile number
            existing_user = db.query(User).filter(User.phone == normalized_phone).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This mobile number is already registered. Please log in."
                )

            # 3. Create persistent Farmer profile
            farmer_id = f"farmer_{uuid.uuid4().hex[:10]}"
            user_id = f"user_{uuid.uuid4().hex[:10]}"

            # Determine farmer category
            acres = float(req.land_size_acres)
            if acres <= 2.5:
                category = "marginal"
            elif acres <= 5.0:
                category = "small"
            elif acres <= 10.0:
                category = "medium"
            else:
                category = "large"

            hashed_pw = self.hash_password(req.password)

            new_farmer = Farmer(
                id=farmer_id,
                name=req.name.strip(),
                phone=normalized_phone,
                state=req.state.strip(),
                district=req.district.strip(),
                taluka=req.taluka.strip() if req.taluka else None,
                village=req.village.strip() if req.village else None,
                land_size_acres=acres,
                farmer_category=category,
                crops=json.dumps(req.crops or []),
                soil_type=req.soil_type.strip() if req.soil_type else None,
                owns_land=bool(req.owns_land),
                has_irrigation=bool(req.has_irrigation),
                irrigation_type=req.irrigation_type.strip() if req.irrigation_type else None,
                is_tax_payer=False,
                age=int(req.age or 40),
                pm_kisan_registered=True,
                preferred_language=pref_lang,
                is_demo=False
            )
            db.add(new_farmer)
            db.flush()

            # 4. Create User credential record
            new_user = User(
                id=user_id,
                phone=normalized_phone,
                password_hash=hashed_pw,
                name=req.name.strip(),
                preferred_language=pref_lang,
                farmer_id=farmer_id,
                is_active=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_farmer)
            db.refresh(new_user)

            logger.info(f"Registered new farmer: {farmer_id} ({normalized_phone})")

            # 5. Generate Access Token
            token_payload = {
                "sub": user_id,
                "farmer_id": farmer_id,
                "phone": normalized_phone,
                "name": new_user.name,
                "is_demo": False
            }
            token = self.create_access_token(token_payload)

            return {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": new_user.id,
                    "phone": new_user.phone,
                    "name": new_user.name,
                    "preferred_language": new_user.preferred_language,
                    "farmer_id": new_user.farmer_id,
                    "is_active": new_user.is_active,
                    "created_at": new_user.created_at
                },
                "farmer": farmer_service._farmer_to_dict(new_farmer)
            }
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error registering farmer: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Registration failed: {str(e)}"
            )
        finally:
            db.close()

    def login_farmer(self, req: LoginRequest, client_ip: str = "unknown") -> Dict[str, Any]:
        """
        Authenticates a farmer by mobile number and password.
        Throttles repeated failed attempts to defend against brute-force.
        """
        normalized_phone = self.normalize_phone(req.phone)
        throttle_key = f"{normalized_phone}:{client_ip}"

        if throttler.is_throttled(throttle_key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Please wait 5 minutes before trying again."
            )

        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(User.phone == normalized_phone).first()
            if not user or not self.verify_password(req.password, user.password_hash):
                throttler.record_failure(throttle_key)
                # Consistent error message; do not leak whether mobile exists
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid mobile number or password."
                )

            # Login successful: clear throttler
            throttler.record_success(throttle_key)

            farmer = db.query(Farmer).filter(Farmer.id == user.farmer_id).first()
            if not farmer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Associated farmer profile not found."
                )

            token_payload = {
                "sub": user.id,
                "farmer_id": farmer.id,
                "phone": user.phone,
                "name": user.name,
                "is_demo": False
            }
            token = self.create_access_token(token_payload)

            logger.info(f"Farmer logged in successfully: {farmer.id}")

            return {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "phone": user.phone,
                    "name": user.name,
                    "preferred_language": user.preferred_language,
                    "farmer_id": user.farmer_id,
                    "is_active": user.is_active,
                    "created_at": user.created_at
                },
                "farmer": farmer_service._farmer_to_dict(farmer)
            }
        finally:
            db.close()

    def get_current_user_and_farmer(self, token: str) -> Tuple[User, Farmer]:
        """Validates token and returns active User and Farmer records."""
        payload = self.decode_access_token(token)
        user_id = payload.get("sub")
        farmer_id = payload.get("farmer_id")

        if not user_id or not farmer_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload."
            )

        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()

            if not user or not farmer:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session invalid or user not found."
                )

            return user, farmer
        finally:
            db.close()


auth_service = AuthService()


# --- FastAPI Dependencies for Authentication & IDOR Protection ---

def extract_token_from_header(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extracts bearer token from Authorization header."""
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_current_farmer_context(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    Extracts authenticated user context if valid bearer token is present.
    Returns None if no token or token is invalid.
    """
    token = extract_token_from_header(authorization)
    if not token:
        return None
    try:
        payload = auth_service.decode_access_token(token)
        return payload
    except Exception:
        return None


def require_authenticated_farmer(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Strictly requires an authenticated farmer session."""
    token = extract_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to access your farmer records.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return auth_service.decode_access_token(token)
