"""
FitForge Backend API Tests
Tests: Auth (register/login), Nutrition (manual log, copy-yesterday),
Steps, Water, Stats, Profile endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

TEST_EMAIL = f"TEST_fitforge_{int(time.time())}@test.com"
TEST_PASSWORD = "TestPass1234"
TEST_NAME = "Test FitForge User"

EXISTING_EMAIL = "testuser@fitforge.com"
EXISTING_PASSWORD = "Test1234"


# ---- Fixtures ----

@pytest.fixture(scope="module")
def registered_user():
    """Register a fresh test user, return token + user info"""
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    })
    assert resp.status_code == 200, f"Registration failed: {resp.text}"
    data = resp.json()
    return data


@pytest.fixture(scope="module")
def auth_token(registered_user):
    return registered_user["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def existing_token():
    """Login with existing test account"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": EXISTING_EMAIL,
        "password": EXISTING_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json()["token"]
    pytest.skip(f"Existing user login failed: {resp.text}")


@pytest.fixture(scope="module")
def existing_headers(existing_token):
    return {"Authorization": f"Bearer {existing_token}"}


# ---- Auth Tests ----

class TestAuth:
    """Authentication endpoint tests"""

    def test_register_new_user(self):
        unique_email = f"TEST_reg_{int(time.time())}@test.com"
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Password123",
            "name": "Test Register"
        })
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert isinstance(data["token"], str) and len(data["token"]) > 10
        print(f"PASS: Register new user → token received")

    def test_register_duplicate_email_fails(self, registered_user):
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Duplicate"
        })
        assert resp.status_code == 400, f"Expected 400 got {resp.status_code}: {resp.text}"
        print("PASS: Duplicate email returns 400")

    def test_register_missing_fields(self):
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "incomplete@test.com"
        })
        assert resp.status_code in [400, 422], f"Expected 400/422 got {resp.status_code}: {resp.text}"
        print("PASS: Missing fields returns 400/422")

    def test_login_existing_user(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EXISTING_EMAIL,
            "password": EXISTING_PASSWORD
        })
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == EXISTING_EMAIL
        print(f"PASS: Login existing user → token received")

    def test_login_invalid_password(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EXISTING_EMAIL,
            "password": "wrongpassword"
        })
        assert resp.status_code == 401, f"Expected 401 got {resp.status_code}: {resp.text}"
        print("PASS: Wrong password returns 401")

    def test_login_nonexistent_user(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "doesnotexist@nowhere.com",
            "password": "somepass"
        })
        assert resp.status_code == 401, f"Expected 401 got {resp.status_code}: {resp.text}"
        print("PASS: Nonexistent user returns 401")

    def test_get_me(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "email" in data
        assert data["email"] == TEST_EMAIL
        print("PASS: /auth/me returns current user")

    def test_get_me_unauthorized(self):
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 401
        print("PASS: /auth/me without token returns 401")


# ---- Profile Tests ----

class TestProfile:
    """Profile endpoint tests"""

    def test_get_profile(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/profile", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "user_id" in data
        assert "calTarget" in data
        assert "weight" in data
        print("PASS: GET /profile returns profile data")

    def test_update_profile(self, auth_headers):
        resp = requests.put(f"{BASE_URL}/api/profile", headers=auth_headers, json={
            "name": "Updated Test Name",
            "calTarget": 2000
        })
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["calTarget"] == 2000
        print("PASS: PUT /profile updates successfully")


# ---- Nutrition Tests ----

class TestNutrition:
    """Nutrition manual logging and copy-yesterday tests"""

    def test_log_nutrition_quick_mode(self, auth_headers):
        """Log nutrition in 'total' (quick) mode"""
        resp = requests.post(f"{BASE_URL}/api/nutrition/manual", headers=auth_headers, json={
            "mode": "total",
            "calories": 1800,
            "date": "2026-02-25"
        })
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["total"]["calories"] == 1800
        assert data["date"] == "2026-02-25"
        assert data["source"] == "manual"
        print("PASS: Log nutrition quick mode → 1800 cal")

    def test_log_nutrition_macros_mode(self, auth_headers):
        """Log nutrition in macros mode; calories auto-calculated"""
        resp = requests.post(f"{BASE_URL}/api/nutrition/manual", headers=auth_headers, json={
            "mode": "macros",
            "carbs": 200,
            "protein": 150,
            "fat": 60,
            "date": "2026-02-24"
        })
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        # 200*4 + 150*4 + 60*9 = 800+600+540 = 1940
        expected_cal = 200 * 4 + 150 * 4 + 60 * 9
        assert data["total"]["calories"] == expected_cal, f"Expected {expected_cal} got {data['total']['calories']}"
        assert data["total"]["carbs"] == 200
        assert data["total"]["protein"] == 150
        assert data["total"]["fat"] == 60
        print(f"PASS: Log nutrition macros mode → {expected_cal} cal auto-calculated")

    def test_get_nutrition_for_date(self, auth_headers):
        """Get nutrition for a specific date"""
        resp = requests.get(f"{BASE_URL}/api/nutrition?date=2026-02-25", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["total"]["calories"] == 1800
        print("PASS: GET /nutrition?date returns logged data")

    def test_get_nutrition_empty_date(self, auth_headers):
        """Get nutrition for date with no data returns empty"""
        resp = requests.get(f"{BASE_URL}/api/nutrition?date=2020-01-01", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"]["calories"] == 0
        print("PASS: GET /nutrition for empty date returns 0 calories")

    def test_copy_nutrition_from_yesterday(self, auth_headers):
        """Copy yesterday's nutrition to target date"""
        # First log nutrition for date 2026-02-25
        requests.post(f"{BASE_URL}/api/nutrition/manual", headers=auth_headers, json={
            "mode": "total",
            "calories": 2100,
            "date": "2026-02-25"
        })
        # Copy from 2026-02-25 to 2026-02-26
        resp = requests.get(f"{BASE_URL}/api/nutrition/copy-yesterday?date=2026-02-26", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["source"] == "copied_from_yesterday"
        assert data["date"] == "2026-02-26"
        assert data["from_date"] == "2026-02-25"
        assert data["total"]["calories"] == 2100
        print("PASS: Copy nutrition from yesterday → data copied correctly")

    def test_copy_yesterday_no_data(self, auth_headers):
        """Copy from yesterday with no data returns 404"""
        resp = requests.get(f"{BASE_URL}/api/nutrition/copy-yesterday?date=2020-01-02", headers=auth_headers)
        assert resp.status_code == 404
        print("PASS: Copy yesterday with no data returns 404")


# ---- Steps Tests ----

class TestSteps:
    """Steps endpoint tests"""

    def test_log_steps(self, auth_headers):
        resp = requests.post(f"{BASE_URL}/api/steps", headers=auth_headers, json={
            "steps": 8000,
            "date": "2026-02-25"
        })
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["steps"] == 8000
        print("PASS: Log 8000 steps")

    def test_update_steps_same_date(self, auth_headers):
        """Logging steps for same date updates existing record"""
        resp = requests.post(f"{BASE_URL}/api/steps", headers=auth_headers, json={
            "steps": 10000,
            "date": "2026-02-25"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["steps"] == 10000
        print("PASS: Update steps for existing date")

    def test_get_steps(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/steps", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /steps returns list of {len(data)} entries")


# ---- Water Tests ----

class TestWater:
    """Water endpoint tests"""

    def test_update_water(self, auth_headers):
        resp = requests.post(f"{BASE_URL}/api/water", headers=auth_headers, json={
            "glasses": 6,
            "date": "2026-02-25"
        })
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["glasses"] == 6
        print("PASS: Update water → 6 glasses")

    def test_get_water(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/water?date=2026-02-25", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["glasses"] == 6
        print("PASS: GET /water returns correct glass count")

    def test_get_water_empty_date(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/water?date=2020-01-01", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["glasses"] == 0
        print("PASS: GET /water empty date returns 0 glasses")


# ---- Stats Tests ----

class TestStats:
    """Stats endpoint tests"""

    def test_get_stats_today(self, auth_headers):
        from datetime import datetime
        today = datetime.utcnow().strftime("%Y-%m-%d")
        resp = requests.get(f"{BASE_URL}/api/stats?date={today}", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "bmi" in data
        assert "deficit" in data
        assert "eaten" in data
        assert "burned_today" in data
        assert data["date"] == today
        print(f"PASS: GET /stats → BMI={data['bmi']}, deficit={data['deficit']}")

    def test_get_stats_with_nutrition(self, auth_headers):
        """Stats should reflect logged nutrition"""
        # Log nutrition for 2026-02-25
        requests.post(f"{BASE_URL}/api/nutrition/manual", headers=auth_headers, json={
            "mode": "total",
            "calories": 1800,
            "date": "2026-02-25"
        })
        resp = requests.get(f"{BASE_URL}/api/stats?date=2026-02-25", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["has_nutrition"] is True
        assert data["eaten"] == 1800
        print(f"PASS: Stats reflects logged nutrition: eaten={data['eaten']}")

    def test_get_stats_historical_date(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/stats?date=2026-02-20", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "deficit" in data
        assert data["date"] == "2026-02-20"
        print("PASS: GET /stats with historical date works")


# ---- Workouts Tests ----

class TestWorkouts:
    """Workouts endpoint tests"""

    def test_add_workout(self, auth_headers):
        resp = requests.post(f"{BASE_URL}/api/workouts", headers=auth_headers, json={
            "type": "TEST_Chest Day",
            "duration": 45,
            "calories": 350,
            "notes": "Test workout"
        })
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["type"] == "TEST_Chest Day"
        assert data["duration"] == 45
        assert "id" in data
        print(f"PASS: Add workout → id={data['id']}")
        return data["id"]

    def test_get_workouts(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/workouts", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /workouts returns {len(data)} workouts")

    def test_delete_workout(self, auth_headers):
        # First create a workout
        create_resp = requests.post(f"{BASE_URL}/api/workouts", headers=auth_headers, json={
            "type": "TEST_To Delete",
            "duration": 30,
            "calories": 200,
            "notes": ""
        })
        wid = create_resp.json()["id"]
        # Delete it
        del_resp = requests.delete(f"{BASE_URL}/api/workouts/{wid}", headers=auth_headers)
        assert del_resp.status_code == 200
        print("PASS: Delete workout works")
