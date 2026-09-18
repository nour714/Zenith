"""
End-to-End API Integration, Authentication & Multi-Tenancy Security Test Suite.
Run with: python backend/tests/test_api.py
"""
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.core.config import settings
from main import app

client = TestClient(app)


def test_system():
    print("=" * 65)
    print("Zenith Full Architecture, Authentication & Multi-Tenancy Tests")
    print("=" * 65)

    # 1. Test Static Index Serving
    print("1. Testing GET / (Frontend Static Serving)...")
    res = client.get("/")
    assert res.status_code == 200, f"Failed: {res.status_code}"
    assert "Zenith" in res.text
    print("   -> OK! Frontend index.html served properly with Zenith brand.")

    # 2. Test Unauthenticated Access Protection (401)
    print("2. Testing Unauthenticated Access Protection (401 Unauthorized)...")
    res_stats_unauth = client.get("/api/v1/stats")
    assert res_stats_unauth.status_code == 401, f"Expected 401, got {res_stats_unauth.status_code}"

    res_tasks_unauth = client.get("/api/v1/tasks")
    assert res_tasks_unauth.status_code == 401, f"Expected 401, got {res_tasks_unauth.status_code}"

    res_notes_unauth = client.get("/api/v1/notes")
    assert res_notes_unauth.status_code == 401, f"Expected 401, got {res_notes_unauth.status_code}"
    print("   -> OK! Protected endpoints correctly reject unauthenticated requests with 401.")

    # 3. Test User Registration (User A)
    print("3. Testing User Registration (POST /api/v1/auth/register)...")
    uid_a = uuid.uuid4().hex[:8]
    user_a_email = f"test_a_{uid_a}@zenith.app"
    user_a_password = "Password123!"

    reg_payload = {
        "email": user_a_email,
        "password": user_a_password,
        "full_name": f"Zenith User A {uid_a}"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == user_a_email
    token_a = reg_data["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    print(f"   -> OK! User A registered successfully: {user_a_email}")

    # 4. Test User Login (User A)
    print("4. Testing User Login (POST /api/v1/auth/login)...")
    login_payload = {
        "email": user_a_email,
        "password": user_a_password
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_data = login_res.json()
    assert "access_token" in login_data
    print("   -> OK! Login succeeded and returned valid JWT token.")

    # 5. Test Current User Profile (GET /api/v1/auth/me)
    print("5. Testing GET /api/v1/auth/me...")
    me_res = client.get("/api/v1/auth/me", headers=headers_a)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == user_a_email
    print(f"   -> OK! Profile verified for: {me_data['full_name']}")

    # 6. Test User A Task Lifecycle
    print("6. Testing User A Task Lifecycle (POST, PATCH, DELETE)...")
    task_payload = {
        "title": "مراجعة كود مشروع يوتيوب",
        "description": "فحص معمارية الكود النظيف",
        "priority": "high",
        "category": "study"
    }
    task_res = client.post("/api/v1/tasks", json=task_payload, headers=headers_a)
    assert task_res.status_code == 201, f"Create task failed: {task_res.text}"
    task_a_id = task_res.json()["data"]["id"]

    toggle_res = client.patch(f"/api/v1/tasks/{task_a_id}/toggle", headers=headers_a)
    assert toggle_res.status_code == 200
    assert bool(toggle_res.json()["data"]["is_completed"]) is True
    print("   -> OK! Task created and completed for User A.")

    # 7. Test User A Note Lifecycle
    print("7. Testing User A Note Creation (POST /api/v1/notes)...")
    note_payload = {
        "title": "ملاحظات المسار الأول",
        "content": "## المفاهيم الأساسية\n- التدوين السريع\n- مراجعة الكود"
    }
    note_res = client.post("/api/v1/notes", json=note_payload, headers=headers_a)
    assert note_res.status_code == 201
    note_a_id = note_res.json()["data"]["id"]
    print("   -> OK! Note created for User A.")

    # 8. Test Multi-Tenancy Data Isolation (User B)
    print("8. Testing Multi-Tenancy Data Isolation (User B)...")
    uid_b = uuid.uuid4().hex[:8]
    user_b_email = f"test_b_{uid_b}@zenith.app"
    reg_b = client.post("/api/v1/auth/register", json={
        "email": user_b_email,
        "password": "Password123!",
        "full_name": f"Zenith User B {uid_b}"
    })
    assert reg_b.status_code == 201
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B should NOT see User A's tasks or notes
    tasks_b_res = client.get("/api/v1/tasks", headers=headers_b)
    assert tasks_b_res.status_code == 200
    user_b_task_ids = [t["id"] for t in tasks_b_res.json()["data"]]
    assert task_a_id not in user_b_task_ids, "CRITICAL: User B saw User A's private task!"

    notes_b_res = client.get("/api/v1/notes", headers=headers_b)
    assert notes_b_res.status_code == 200
    user_b_note_ids = [n["id"] for n in notes_b_res.json()["data"]]
    assert note_a_id not in user_b_note_ids, "CRITICAL: User B saw User A's private note!"

    # User B cannot toggle or delete User A's task (should return 404 or fail)
    toggle_unauthorized = client.patch(f"/api/v1/tasks/{task_a_id}/toggle", headers=headers_b)
    assert toggle_unauthorized.status_code in [404, 403], f"Expected 404/403, got {toggle_unauthorized.status_code}"
    print("   -> OK! Perfect multi-tenancy isolation between User A and User B.")

    # 9. Test Settings Endpoint Masking & Isolation
    print("9. Testing User-Scoped Settings & Secret Masking...")
    secret_key = "AIzaSySecretApiKey123456789"
    save_res = client.post(
        "/api/v1/settings",
        json={"settings": {"gemini_api_key": secret_key, "language": "ar"}},
        headers=headers_a
    )
    assert save_res.status_code == 200
    save_data = save_res.json()["data"]
    assert "gemini_api_key" not in save_data, "Leaked raw secret in POST response!"
    assert save_data.get("gemini_api_key_masked") == "AIza...6789"

    get_res = client.get("/api/v1/settings", headers=headers_a)
    assert get_res.status_code == 200
    assert "gemini_api_key" not in get_res.json()["data"]
    assert secret_key not in get_res.text

    # User B should have separate settings without User A's key
    get_b_settings = client.get("/api/v1/settings", headers=headers_b)
    assert get_b_settings.status_code == 200
    assert get_b_settings.json()["data"].get("gemini_api_key_masked") is None
    print("   -> OK! Settings are strictly isolated and secrets masked per user.")

    # Cleanup test items
    client.delete(f"/api/v1/tasks/{task_a_id}", headers=headers_a)
    client.delete(f"/api/v1/notes/{note_a_id}", headers=headers_a)

    print("=" * 65)
    print("ALL ZENITH E2E INTEGRATION & SECURITY TESTS PASSED 100%!")
    print("=" * 65)


if __name__ == "__main__":
    test_system()
