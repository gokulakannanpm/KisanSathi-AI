import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import SessionLocal, User, Farmer, DiaryEntry
from app.services.auth_service import auth_service, throttler

client = TestClient(app)


def _cleanup_test_data():
    throttler.reset_all()
    db = SessionLocal()
    try:
        test_users = db.query(User).filter(User.phone.like("+9198421000%")).all()
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


def test_01_successful_registration():
    """Test 1: Successful registration creates User and Farmer records."""
    mobile = "9842100001"
    payload = {
        "name": "Murugan Velu",
        "phone": mobile,
        "password": "FarmPassword123",
        "confirm_password": "FarmPassword123",
        "state": "Tamil Nadu",
        "district": "Madurai",
        "village": "Melur",
        "preferred_language": "ta",
        "land_size_acres": 3.5,
        "owns_land": True,
        "crops": ["paddy", "banana"],
        "has_irrigation": True,
        "irrigation_type": "Borewell",
        "soil_type": "Red Sandy Loam",
        "age": 44
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["phone"] == "+919842100001"
    assert data["user"]["name"] == "Murugan Velu"
    assert data["farmer"]["state"] == "Tamil Nadu"
    assert data["farmer"]["district"] == "Madurai"
    assert data["farmer"]["preferred_language"] == "ta"
    assert data["farmer"]["farmer_category"] == "small"
    assert "paddy" in data["farmer"]["crops"]


def test_02_duplicate_mobile_number_rejection():
    """Test 2: Duplicate mobile-number registration is rejected with 409 Conflict."""
    mobile = "9842100002"
    payload = {
        "name": "Karthik Raja",
        "phone": mobile,
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
        "state": "Tamil Nadu",
        "district": "Coimbatore",
        "land_size_acres": 2.0,
        "crops": ["coconut"]
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    # Attempt registration with same phone
    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already registered" in res2.json()["detail"].lower()


def test_03_invalid_registration_data():
    """Test 3: Invalid registration data (mismatched password, invalid phone, negative acres)."""
    # Password mismatch
    res_mismatch = client.post("/api/auth/register", json={
        "name": "Invalid Farmer",
        "phone": "9842100003",
        "password": "Password123",
        "confirm_password": "WrongPassword456",
        "state": "Tamil Nadu",
        "district": "Salem",
        "land_size_acres": 2.0
    })
    assert res_mismatch.status_code == 400
    assert "do not match" in res_mismatch.json()["detail"].lower()

    # Invalid phone format
    res_phone = client.post("/api/auth/register", json={
        "name": "Invalid Phone",
        "phone": "12345",
        "password": "Password123",
        "confirm_password": "Password123",
        "state": "Tamil Nadu",
        "district": "Salem",
        "land_size_acres": 2.0
    })
    assert res_phone.status_code == 400 or res_phone.status_code == 422

    # Negative land size
    res_land = client.post("/api/auth/register", json={
        "name": "Invalid Land",
        "phone": "9842100004",
        "password": "Password123",
        "confirm_password": "Password123",
        "state": "Tamil Nadu",
        "district": "Salem",
        "land_size_acres": -5.0
    })
    assert res_land.status_code in [400, 422]


def test_04_password_hashing_and_verification():
    """Test 4: Passwords are hashed with bcrypt and verified properly."""
    plain = "MySecretAgriKey99"
    h = auth_service.hash_password(plain)
    assert h != plain
    assert h.startswith("$2b$") or h.startswith("$2a$")
    assert auth_service.verify_password(plain, h) is True
    assert auth_service.verify_password("WrongPassword", h) is False


def test_05_successful_login():
    """Test 5: Registered user logs in successfully with mobile and password."""
    mobile = "9842100005"
    client.post("/api/auth/register", json={
        "name": "Prakash Rao",
        "phone": mobile,
        "password": "FarmerPrakash2026",
        "confirm_password": "FarmerPrakash2026",
        "state": "Maharashtra",
        "district": "Pune",
        "land_size_acres": 4.0,
        "crops": ["sugarcane"]
    })

    login_res = client.post("/api/auth/login", json={
        "phone": mobile,
        "password": "FarmerPrakash2026"
    })
    assert login_res.status_code == 200
    body = login_res.json()
    assert "access_token" in body
    assert body["user"]["phone"] == "+919842100005"
    assert body["farmer"]["district"] == "Pune"


def test_06_incorrect_password_rejection():
    """Test 6: Incorrect password is rejected with 401."""
    mobile = "9842100006"
    client.post("/api/auth/register", json={
        "name": "Vijay Shankar",
        "phone": mobile,
        "password": "CorrectPassword123",
        "confirm_password": "CorrectPassword123",
        "state": "Maharashtra",
        "district": "Nashik",
        "land_size_acres": 5.0
    })

    bad_login = client.post("/api/auth/login", json={
        "phone": mobile,
        "password": "IncorrectPassword"
    })
    assert bad_login.status_code == 401
    assert "invalid mobile number or password" in bad_login.json()["detail"].lower()


def test_07_logout_and_session_restoration():
    """Test 7: Logout endpoint works and /api/auth/me restores valid session."""
    mobile = "9842100007"
    reg = client.post("/api/auth/register", json={
        "name": "Sita Devi",
        "phone": mobile,
        "password": "SitaPassword2026",
        "confirm_password": "SitaPassword2026",
        "state": "Gujarat",
        "district": "Surat",
        "land_size_acres": 1.5
    }).json()

    token = reg["access_token"]

    # Session restoration via /api/auth/me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["user"]["name"] == "Sita Devi"
    assert me_res.json()["farmer"]["district"] == "Surat"

    # Logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200


def test_08_protected_endpoint_without_auth():
    """Test 8: Accessing protected endpoints without auth returns 401."""
    # /api/auth/me without token
    res_me = client.get("/api/auth/me")
    assert res_me.status_code == 401

    # PUT /api/farmer/profile without token
    res_put = client.put("/api/farmer/profile", json={"land_size_acres": 10.0})
    assert res_put.status_code == 401


def test_09_user_unable_to_read_or_modify_another_users_profile():
    """Test 9: User A cannot read or modify User B's profile (IDOR protection)."""
    # Register Farmer A
    res_a = client.post("/api/auth/register", json={
        "name": "Farmer Alpha",
        "phone": "9842100008",
        "password": "AlphaPassword1",
        "confirm_password": "AlphaPassword1",
        "state": "Tamil Nadu",
        "district": "Tiruchirappalli",
        "land_size_acres": 2.5
    }).json()
    token_a = res_a["access_token"]
    farmer_a_id = res_a["farmer"]["id"]

    # Register Farmer B
    res_b = client.post("/api/auth/register", json={
        "name": "Farmer Beta",
        "phone": "9842100009",
        "password": "BetaPassword1",
        "confirm_password": "BetaPassword1",
        "state": "Tamil Nadu",
        "district": "Madurai",
        "land_size_acres": 5.0
    }).json()
    farmer_b_id = res_b["farmer"]["id"]

    # Farmer A tries to view Farmer B's profile
    peek_res = client.get(f"/api/farmer/{farmer_b_id}/profile", headers={"Authorization": f"Bearer {token_a}"})
    assert peek_res.status_code == 403
    assert "access denied" in peek_res.json()["detail"].lower()

    # Farmer A tries to modify Farmer B's profile
    tamper_res = client.put(f"/api/farmer/{farmer_b_id}/profile", json={"land_size_acres": 100.0}, headers={"Authorization": f"Bearer {token_a}"})
    assert tamper_res.status_code == 403


def test_10_user_unable_to_access_another_users_diary():
    """Test 10: User A cannot access or add entries to User B's diary (IDOR protection)."""
    # Register Farmer A
    res_a = client.post("/api/auth/register", json={
        "name": "Farmer Diary A",
        "phone": "9842100010",
        "password": "DiaryPasswordA",
        "confirm_password": "DiaryPasswordA",
        "state": "Tamil Nadu",
        "district": "Erode",
        "land_size_acres": 3.0
    }).json()
    token_a = res_a["access_token"]

    # Register Farmer B
    res_b = client.post("/api/auth/register", json={
        "name": "Farmer Diary B",
        "phone": "9842100011",
        "password": "DiaryPasswordB",
        "confirm_password": "DiaryPasswordB",
        "state": "Tamil Nadu",
        "district": "Salem",
        "land_size_acres": 4.0
    }).json()
    farmer_b_id = res_b["farmer"]["id"]

    # Farmer A attempts to read Farmer B's diary
    res_read = client.get(f"/api/farmer/{farmer_b_id}/diary", headers={"Authorization": f"Bearer {token_a}"})
    assert res_read.status_code == 403

    # Farmer A attempts to post to Farmer B's diary
    res_post = client.post(f"/api/farmer/{farmer_b_id}/diary", json={
        "date": "2026-10-15",
        "activity_type": "Irrigation",
        "crop": "Paddy",
        "notes": "Unauthorized entry",
        "quantity_cost": "500"
    }, headers={"Authorization": f"Bearer {token_a}"})
    assert res_post.status_code == 403


def test_11_profile_changes_persist_after_relogin():
    """Test 11: Profile updates persist in database across new logins."""
    mobile = "9842100012"
    client.post("/api/auth/register", json={
        "name": "Original Name",
        "phone": mobile,
        "password": "PersistentPass1",
        "confirm_password": "PersistentPass1",
        "state": "Maharashtra",
        "district": "Nagpur",
        "land_size_acres": 2.0,
        "crops": ["cotton"]
    })

    # Login 1
    log1 = client.post("/api/auth/login", json={"phone": mobile, "password": "PersistentPass1"}).json()
    token1 = log1["access_token"]

    # Update profile
    update_res = client.put("/api/farmer/profile", json={
        "name": "Updated Name",
        "land_size_acres": 8.5,
        "crops": ["cotton", "soybean", "turmeric"],
        "preferred_language": "mr"
    }, headers={"Authorization": f"Bearer {token1}"})
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Name"
    assert update_res.json()["land_size_acres"] == 8.5
    assert update_res.json()["preferred_language"] == "mr"

    # Login 2 (simulating new session after logout)
    log2 = client.post("/api/auth/login", json={"phone": mobile, "password": "PersistentPass1"}).json()
    assert log2["farmer"]["name"] == "Updated Name"
    assert log2["farmer"]["land_size_acres"] == 8.5
    assert "turmeric" in log2["farmer"]["crops"]
    assert log2["farmer"]["preferred_language"] == "mr"


def test_12_demo_profiles_continue_to_work():
    """Test 12: Existing 4 demo profiles (demo_farmer_01 to demo_farmer_04) remain accessible."""
    for demo_id in ["demo_farmer_01", "demo_farmer_02", "demo_farmer_03", "demo_farmer_04"]:
        res = client.get(f"/api/farmer/{demo_id}/profile")
        assert res.status_code == 200, f"Demo farmer {demo_id} failed"
        profile = res.json()
        assert profile["id"] == demo_id
        assert "name" in profile
        assert "crops" in profile

        # Diary for demo farmer
        diary_res = client.get(f"/api/farmer/{demo_id}/diary")
        assert diary_res.status_code == 200


def test_13_koyambedu_restricted_to_demo_farmer_03():
    """Test 13: Koyambedu benchmark is strictly available ONLY to demo_farmer_03."""
    # 1. demo_farmer_03 has access
    koyambedu_demo3 = client.get("/api/mandi/koyambedu-benchmark?farmer_id=demo_farmer_03")
    assert koyambedu_demo3.status_code == 200
    assert koyambedu_demo3.json()["eligible"] is True

    # 2. Other demo farmers do NOT have access
    koyambedu_demo1 = client.get("/api/mandi/koyambedu-benchmark?farmer_id=demo_farmer_01")
    assert koyambedu_demo1.status_code == 200
    assert koyambedu_demo1.json()["eligible"] is False

    # 3. Registered farmer in Tamil Nadu does NOT have access
    reg_tn = client.post("/api/auth/register", json={
        "name": "Registered TN Farmer",
        "phone": "9842100013",
        "password": "PasswordTN123",
        "confirm_password": "PasswordTN123",
        "state": "Tamil Nadu",
        "district": "Thanjavur",
        "land_size_acres": 2.0
    }).json()
    reg_id = reg_tn["farmer"]["id"]

    koyambedu_reg = client.get(f"/api/mandi/koyambedu-benchmark?farmer_id={reg_id}")
    assert koyambedu_reg.status_code == 200
    assert koyambedu_reg.json()["eligible"] is False


def test_14_login_throttling_after_repeated_failures():
    """Test 14: Repeated failed login attempts trigger 429 Too Many Requests throttling."""
    mobile = "9842100014"
    client.post("/api/auth/register", json={
        "name": "Throttle Test Farmer",
        "phone": mobile,
        "password": "CorrectPassword123",
        "confirm_password": "CorrectPassword123",
        "state": "Maharashtra",
        "district": "Nagpur",
        "land_size_acres": 2.0
    })

    # Trigger 5 failed attempts
    for _ in range(5):
        res = client.post("/api/auth/login", json={
            "phone": mobile,
            "password": "WrongPassword999"
        })
        assert res.status_code == 401

    # 6th attempt should be throttled with HTTP 429
    throttled_res = client.post("/api/auth/login", json={
        "phone": mobile,
        "password": "CorrectPassword123"
    })
    assert throttled_res.status_code == 429
    assert "too many failed login attempts" in throttled_res.json()["detail"].lower()
