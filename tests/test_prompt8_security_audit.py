import os
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.models import SessionLocal, User, Farmer, DiaryEntry
from app.services.auth_service import (
    auth_service,
    throttler,
    get_jwt_secret,
    DEV_SECRET_FALLBACK,
    verify_farmer_access
)

client = TestClient(app)


def _cleanup_test_data():
    throttler.reset_all()
    db = SessionLocal()
    try:
        test_users = db.query(User).filter(User.phone.like("+9198422000%")).all()
        for u in test_users:
            f_id = u.farmer_id
            db.delete(u)
            farmer = db.query(Farmer).filter(Farmer.id == f_id).first()
            if farmer:
                db.delete(farmer)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


@pytest.fixture(autouse=True)
def clean_test_users():
    """Ensure clean test state before and after each test."""
    _cleanup_test_data()
    yield
    _cleanup_test_data()


# =========================================================================
# 1. JWT Secret and Production Startup Validation
# =========================================================================

def test_01_production_secret_key_validation():
    """Verify that production mode strictly rejects missing, short, or default fallback secrets."""
    with patch.dict(os.environ, {"ENVIRONMENT": "production", "SECRET_KEY": ""}, clear=False):
        with patch("app.services.auth_service.IS_PRODUCTION", True):
            with pytest.raises(RuntimeError) as exc_info:
                get_jwt_secret()
            assert "SECRET_KEY" in str(exc_info.value)
            assert "required in production" in str(exc_info.value)

    # Rejection of default development fallback in production
    with patch.dict(os.environ, {"ENVIRONMENT": "production", "SECRET_KEY": DEV_SECRET_FALLBACK}, clear=False):
        with patch("app.services.auth_service.IS_PRODUCTION", True):
            with pytest.raises(RuntimeError) as exc_info:
                get_jwt_secret()
            assert "cryptographically strong" in str(exc_info.value)

    # Rejection of too-short secret in production (< 32 characters)
    with patch.dict(os.environ, {"ENVIRONMENT": "production", "SECRET_KEY": "too-short-secret-key"}, clear=False):
        with patch("app.services.auth_service.IS_PRODUCTION", True):
            with pytest.raises(RuntimeError) as exc_info:
                get_jwt_secret()
            assert "at least 32 characters" in str(exc_info.value)

    # Acceptance of strong 32+ character key in production
    strong_secret = "a" * 32
    with patch.dict(os.environ, {"ENVIRONMENT": "production", "SECRET_KEY": strong_secret}, clear=False):
        with patch("app.services.auth_service.IS_PRODUCTION", True):
            assert get_jwt_secret() == strong_secret


# =========================================================================
# 2. Server-Side Token Revocation on Logout
# =========================================================================

def test_02_server_side_token_revocation_on_logout():
    """Verify that logging out revokes the active token so subsequent calls return 401."""
    mobile = "9842200001"
    reg = client.post("/api/auth/register", json={
        "name": "Revoke Test Farmer",
        "phone": mobile,
        "password": "SecurePassword2026",
        "confirm_password": "SecurePassword2026",
        "state": "Tamil Nadu",
        "district": "Madurai",
        "land_size_acres": 3.0
    }).json()
    token = reg["access_token"]

    # Active token succeeds before logout
    me_before = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_before.status_code == 200

    # Logout with Authorization header to trigger server-side revocation
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200
    assert logout_res.json()["status"] == "success"

    # Token is now revoked on the server; subsequent request must be rejected with 401
    me_after = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_after.status_code == 401
    assert "revoked" in me_after.json()["detail"].lower()


# =========================================================================
# 3. Login Throttling Enforcement and Reset
# =========================================================================

def test_03_login_throttling_enforcement_and_reset():
    """Verify that 5 failed login attempts trigger HTTP 429 Too Many Requests."""
    mobile = "9842200002"
    client.post("/api/auth/register", json={
        "name": "Throttle Test Farmer",
        "phone": mobile,
        "password": "RightPassword123",
        "confirm_password": "RightPassword123",
        "state": "Tamil Nadu",
        "district": "Coimbatore",
        "land_size_acres": 2.5
    })

    # Trigger 5 failed login attempts
    for i in range(5):
        res = client.post("/api/auth/login", json={"phone": mobile, "password": "WrongPassword"})
        assert res.status_code == 401

    # 6th attempt must be locked out with 429
    throttled_res = client.post("/api/auth/login", json={"phone": mobile, "password": "WrongPassword"})
    assert throttled_res.status_code == 429
    assert "too many failed login attempts" in throttled_res.json()["detail"].lower()

    # Even with the right password, user is locked out during window
    locked_res = client.post("/api/auth/login", json={"phone": mobile, "password": "RightPassword123"})
    assert locked_res.status_code == 429

    # Reset throttler to verify successful login clears state
    throttler.reset_all()
    success_res = client.post("/api/auth/login", json={"phone": mobile, "password": "RightPassword123"})
    assert success_res.status_code == 200
    assert "access_token" in success_res.json()


# =========================================================================
# 4. Recommendation Router IDOR Protection
# =========================================================================

def test_04_recommendation_idor_protection():
    """Verify that recommendation endpoints reject unauthorized access to registered farmers."""
    # Register Farmer 1
    f1 = client.post("/api/auth/register", json={
        "name": "Rec Farmer One",
        "phone": "9842200003",
        "password": "PasswordRec1",
        "confirm_password": "PasswordRec1",
        "state": "Tamil Nadu",
        "district": "Thanjavur",
        "land_size_acres": 2.0,
        "crops": ["paddy"]
    }).json()
    token1 = f1["access_token"]
    farmer1_id = f1["farmer"]["id"]

    # Register Farmer 2
    f2 = client.post("/api/auth/register", json={
        "name": "Rec Farmer Two",
        "phone": "9842200004",
        "password": "PasswordRec2",
        "confirm_password": "PasswordRec2",
        "state": "Maharashtra",
        "district": "Nagpur",
        "land_size_acres": 5.0,
        "crops": ["cotton"]
    }).json()
    token2 = f2["access_token"]

    # Unauthenticated request to registered farmer recommendation -> 401
    unauth = client.get(f"/api/recommendation/{farmer1_id}")
    assert unauth.status_code == 401

    # Farmer 2 tries to read Farmer 1's recommendation -> 403 Forbidden
    cross_read = client.get(f"/api/recommendation/{farmer1_id}", headers={"Authorization": f"Bearer {token2}"})
    assert cross_read.status_code == 403
    assert "access denied" in cross_read.json()["detail"].lower()

    # Farmer 1 reads their own recommendation -> 200 OK
    own_read = client.get(f"/api/recommendation/{farmer1_id}", headers={"Authorization": f"Bearer {token1}"})
    assert own_read.status_code == 200
    assert "action" in own_read.json()

    # Farmer 2 tries to acknowledge Farmer 1's recommendation -> 403 Forbidden
    cross_ack = client.post(
        f"/api/recommendation/{farmer1_id}/acknowledge",
        json={"action_key": "spray_action", "status": "acknowledged"},
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert cross_ack.status_code == 403

    # Demo farmer recommendation remains accessible without auth
    demo_rec = client.get("/api/recommendation/demo_farmer_01")
    assert demo_rec.status_code == 200


# =========================================================================
# 5. Crop Planning IDOR Protection
# =========================================================================

def test_05_crop_plan_idor_protection():
    """Verify that crop planning assistant rejects cross-user access for registered profiles."""
    f1 = client.post("/api/auth/register", json={
        "name": "Crop Plan Farmer 1",
        "phone": "9842200005",
        "password": "PasswordCrop1",
        "confirm_password": "PasswordCrop1",
        "state": "Tamil Nadu",
        "district": "Salem",
        "land_size_acres": 4.0
    }).json()
    token1 = f1["access_token"]
    farmer1_id = f1["farmer"]["id"]

    f2 = client.post("/api/auth/register", json={
        "name": "Crop Plan Farmer 2",
        "phone": "9842200006",
        "password": "PasswordCrop2",
        "confirm_password": "PasswordCrop2",
        "state": "Gujarat",
        "district": "Rajkot",
        "land_size_acres": 6.0
    }).json()
    token2 = f2["access_token"]

    # Cross-user POST -> 403
    res_post = client.post(
        f"/api/recommendation/{farmer1_id}/crop-plan",
        json={"season": "kharif"},
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert res_post.status_code == 403

    # Own user POST -> 200
    own_post = client.post(
        f"/api/recommendation/{farmer1_id}/crop-plan",
        json={"season": "kharif"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert own_post.status_code == 200
    assert own_post.json()["status"] == "success"

    # Cross-user GET -> 403
    res_get = client.get(
        f"/api/recommendation/{farmer1_id}/crop-plan?season=kharif",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert res_get.status_code == 403


# =========================================================================
# 6. AI Explain Privacy and IDOR Protection
# =========================================================================

def test_06_ai_explain_idor_and_privacy_protection():
    """Verify that /api/ai/explain prevents exfiltration of registered farmers' private data."""
    f1 = client.post("/api/auth/register", json={
        "name": "AI Test Farmer",
        "phone": "9842200007",
        "password": "PasswordAI123",
        "confirm_password": "PasswordAI123",
        "state": "Tamil Nadu",
        "district": "Erode",
        "land_size_acres": 2.5
    }).json()
    token1 = f1["access_token"]
    farmer1_id = f1["farmer"]["id"]

    # Unauthenticated explain request specifying registered farmer -> 401
    unauth = client.post("/api/ai/explain", json={
        "farmer_id": farmer1_id,
        "question": "What should I spray?"
    })
    assert unauth.status_code == 401

    # Authenticated with matching session -> 200
    auth_ok = client.post("/api/ai/explain", json={
        "farmer_id": farmer1_id,
        "question": "What should I spray?"
    }, headers={"Authorization": f"Bearer {token1}"})
    assert auth_ok.status_code == 200

    # Demo farmer explain without auth -> 200 OK
    demo_ok = client.post("/api/ai/explain", json={
        "farmer_id": "demo_farmer_01",
        "question": "When to apply fertilizer?"
    })
    assert demo_ok.status_code == 200


# =========================================================================
# 7. Schemes Router IDOR Protection
# =========================================================================

def test_07_schemes_idor_protection():
    """Verify that scheme eligibility queries reject cross-user access to registered profiles."""
    f1 = client.post("/api/auth/register", json={
        "name": "Scheme User One",
        "phone": "9842200008",
        "password": "PasswordSch1",
        "confirm_password": "PasswordSch1",
        "state": "Tamil Nadu",
        "district": "Madurai",
        "land_size_acres": 1.5
    }).json()
    token1 = f1["access_token"]
    farmer1_id = f1["farmer"]["id"]

    # Unauthenticated query with registered farmer_id -> 401
    unauth = client.get(f"/api/schemes?farmer_id={farmer1_id}")
    assert unauth.status_code == 401

    # Authenticated query with matching credentials -> 200
    auth_ok = client.get(f"/api/schemes?farmer_id={farmer1_id}", headers={"Authorization": f"Bearer {token1}"})
    assert auth_ok.status_code == 200
    assert len(auth_ok.json()) > 0

    # Demo profile query without credentials -> 200 OK
    demo_ok = client.get("/api/schemes?farmer_id=demo_farmer_01")
    assert demo_ok.status_code == 200


# =========================================================================
# 8. Mobile Number Normalization & Validation
# =========================================================================

def test_08_phone_normalization_and_strict_validation():
    """Verify strict mobile normalization and rejection of malformed or non-Indian formats."""
    # Valid formats normalized to +91XXXXXXXXXX
    assert auth_service.normalize_phone("9876543210") == "+919876543210"
    assert auth_service.normalize_phone("+91 98765 43210") == "+919876543210"
    assert auth_service.normalize_phone("09876543210") == "+919876543210"
    assert auth_service.normalize_phone("919876543210") == "+919876543210"

    # Malformed numbers rejected with 400 Bad Request
    invalid_numbers = [
        "",
        "12345",              # Too short
        "9876543210123",      # Too long
        "5123456789",         # Starts with 5 (not a valid Indian mobile starting digit)
        "abcdefghij",         # Letters
        "+1 555 123 4567",    # US number
    ]
    for num in invalid_numbers:
        with pytest.raises(Exception):
            auth_service.normalize_phone(num)


# =========================================================================
# 9. Koyambedu Strict Restriction to demo_farmer_03
# =========================================================================

def test_09_koyambedu_strict_restriction_to_demo_farmer_03():
    """Verify that Koyambedu benchmark access is strictly denied to any profile other than demo_farmer_03."""
    # demo_farmer_03 has access
    ok_res = client.get("/api/mandi/koyambedu-benchmark?farmer_id=demo_farmer_03")
    assert ok_res.status_code == 200
    assert ok_res.json()["eligible"] is True

    # Other demo farmers are denied access
    for other_demo in ["demo_farmer_01", "demo_farmer_02", "demo_farmer_04"]:
        denied = client.get(f"/api/mandi/koyambedu-benchmark?farmer_id={other_demo}")
        assert denied.status_code == 200
        assert denied.json()["eligible"] is False
        assert "restricted" in denied.json()["message"].lower()

    # Registered farmer is denied access
    reg_denied = client.get("/api/mandi/koyambedu-benchmark?farmer_id=farmer_xyz123")
    assert reg_denied.status_code == 200
    assert reg_denied.json()["eligible"] is False


# =========================================================================
# 10. CORS Configuration
# =========================================================================

def test_10_cors_headers_and_no_wildcard_with_credentials():
    """Verify that OPTIONS preflight returns explicit origin and allow_credentials is True only for explicit origins."""
    res = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert res.headers.get("access-control-allow-credentials") == "true"


# =========================================================================
# 11. Durable Token Revocation Survives Process Restarts
# =========================================================================

def test_11_durable_token_revocation_survives_restart():
    """Verify that a revoked token is rejected even after AuthService in-memory cache is wiped (simulating restart)."""
    from app.services.auth_service import AuthService
    mobile = "9842200009"
    reg = client.post("/api/auth/register", json={
        "name": "Restart Test Farmer",
        "phone": mobile,
        "password": "RestartPassword1",
        "confirm_password": "RestartPassword1",
        "state": "Tamil Nadu",
        "district": "Madurai",
        "land_size_acres": 2.0
    }).json()
    token = reg["access_token"]

    # Revoke the token via logout
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # Simulate process restart by instantiating a brand-new AuthService with an empty in-memory cache
    fresh_service = AuthService()
    assert len(fresh_service._revoked_cache) == 0

    # The fresh service must detect the revocation from the durable SQLite blocklist
    assert fresh_service.is_token_revoked(token) is True

    # Attempting to decode via fresh service must raise HTTP 401
    with pytest.raises(Exception) as exc_info:
        fresh_service.decode_access_token(token)
    assert "revoked" in str(exc_info.value).lower() or "401" in str(exc_info.value)


# =========================================================================
# 12. Malformed and Tampered Token Rejection
# =========================================================================

def test_12_malformed_and_tampered_token_rejection():
    """Verify that malformed, corrupted, or tampered tokens are rejected with 401 across protected endpoints."""
    bad_tokens = [
        "not-a-valid-token",
        "Bearer",
        "Bearer malformed.jwt.token",
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsig"
    ]

    for bt in bad_tokens:
        headers = {"Authorization": bt}
        # /api/auth/me
        res_me = client.get("/api/auth/me", headers=headers)
        assert res_me.status_code == 401

        # /api/farmer/profile (PUT)
        res_put = client.put("/api/farmer/profile", json={"name": "Tampered"}, headers=headers)
        assert res_put.status_code == 401

        # /api/farmer/registered_xyz/diary (GET)
        res_diary = client.get("/api/farmer/farmer_registered_01/diary", headers=headers)
        assert res_diary.status_code == 401


# =========================================================================
# 13. Schemes Single-Scheme and Eligibility Endpoint IDOR Protection
# =========================================================================

def test_13_schemes_single_and_eligibility_idor_protection():
    """Verify that GET /api/schemes/{scheme_id} and eligibility endpoints reject unauthorized registered farmer queries."""
    f1 = client.post("/api/auth/register", json={
        "name": "Scheme IDOR Farmer",
        "phone": "9842200010",
        "password": "PasswordSchIdor1",
        "confirm_password": "PasswordSchIdor1",
        "state": "Tamil Nadu",
        "district": "Thanjavur",
        "land_size_acres": 2.0
    }).json()
    token1 = f1["access_token"]
    farmer1_id = f1["farmer"]["id"]

    # 1. /api/schemes/{scheme_id} with registered farmer ID without auth -> 401
    res1_unauth = client.get(f"/api/schemes/pm_kisan?farmer_id={farmer1_id}")
    assert res1_unauth.status_code == 401

    # 1b. /api/schemes/{scheme_id} with registered farmer ID and matching auth -> 200
    res1_auth = client.get(f"/api/schemes/pm_kisan?farmer_id={farmer1_id}", headers={"Authorization": f"Bearer {token1}"})
    assert res1_auth.status_code == 200
    assert res1_auth.json()["id"] == "pm_kisan"

    # 2. /api/schemes/{scheme_id}/eligibility with registered farmer ID without auth -> 401
    res2_unauth = client.get(f"/api/schemes/pm_kisan/eligibility?farmer_id={farmer1_id}")
    assert res2_unauth.status_code == 401

    # 2b. /api/schemes/{scheme_id}/eligibility with registered farmer ID and matching auth -> 200
    res2_auth = client.get(f"/api/schemes/pm_kisan/eligibility?farmer_id={farmer1_id}", headers={"Authorization": f"Bearer {token1}"})
    assert res2_auth.status_code == 200
    assert res2_auth.json()["scheme_id"] == "pm_kisan"

    # 3. Demo farmer query without auth succeeds for both endpoints
    res_demo1 = client.get("/api/schemes/pm_kisan?farmer_id=demo_farmer_01")
    assert res_demo1.status_code == 200
    res_demo2 = client.get("/api/schemes/pm_kisan/eligibility?farmer_id=demo_farmer_01")
    assert res_demo2.status_code == 200

