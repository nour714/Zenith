"""
End-to-End API Integration and Security Verification Test Suite.
Run with: python backend/tests/test_api.py
"""
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.core.config import settings
from main import app

client = TestClient(app)


def test_system():
    print("=" * 60)
    print("Zenith E2E Integration and Security Tests")
    print("=" * 60)

    # 1. Test Static Index Serving
    print("1. Testing GET / (Frontend Static Serving)...")
    res = client.get("/")
    assert res.status_code == 200, f"Failed: {res.status_code}"
    assert "Zenith" in res.text
    print("   -> OK! Frontend index.html served properly with Zenith brand.")

    # 2. Test Stats
    print("2. Testing GET /api/v1/stats...")
    res = client.get("/api/v1/stats")
    assert res.status_code == 200, f"Stats failed: {res.status_code}"
    stats_data = res.json()
    assert stats_data["success"] is True
    print("   -> OK! Stats retrieved.")

    # 3. Test Task Creation & Lifecycle (Default Open Auth)
    print("3. Testing Task Lifecycle (POST, PATCH, DELETE)...")
    task_payload = {
        "title": "مراجعة كود مشروع يوتيوب",
        "description": "فحص معمارية الكود النظيف",
        "priority": "high",
        "category": "study"
    }
    res = client.post("/api/v1/tasks", json=task_payload)
    assert res.status_code == 201, f"Create task failed: {res.text}"
    task_id = res.json()["data"]["id"]

    res = client.patch(f"/api/v1/tasks/{task_id}/toggle")
    assert res.status_code == 200

    res = client.delete(f"/api/v1/tasks/{task_id}")
    assert res.status_code == 200
    print("   -> OK! Task lifecycle verified.")

    # 4. Test Note Creation
    print("4. Testing POST /api/v1/notes...")
    note_payload = {
        "title": "ملاحظات الدرس الأول",
        "content": "## المفاهيم الأساسية\n- فهم المتغيرات\n- الحلقات التكرارية"
    }
    res = client.post("/api/v1/notes", json=note_payload)
    assert res.status_code == 201
    note_id = res.json()["data"]["id"]
    client.delete(f"/api/v1/notes/{note_id}")
    print("   -> OK! Note created and deleted.")

    # 5. Test Security: Settings Endpoint Redaction of Secrets
    print("5. Testing Security: Settings Endpoint Redacts Raw API Keys & Secrets...")
    secret_key = "AIzaSySecretApiKey123456789"
    secret_token = "MySuperSecretToken999"

    save_res = client.post(
        "/api/v1/settings",
        json={
            "settings": {
                "gemini_api_key": secret_key,
                "custom_token": secret_token,
                "theme": "dark"
            }
        }
    )
    assert save_res.status_code == 200
    save_data = save_res.json()["data"]

    # Verify that raw secret keys are NOT returned in POST response
    assert "gemini_api_key" not in save_data, "Leaked raw gemini_api_key in POST response!"
    assert "custom_token" not in save_data, "Leaked raw custom_token in POST response!"
    assert "gemini_api_key_masked" in save_data
    assert "custom_token_masked" in save_data
    assert save_data["theme"] == "dark"

    # Verify that raw secret keys are NOT returned in GET response
    get_res = client.get("/api/v1/settings")
    assert get_res.status_code == 200
    get_data = get_res.json()["data"]

    assert "gemini_api_key" not in get_data, "Leaked raw gemini_api_key in GET response!"
    assert "custom_token" not in get_data, "Leaked raw custom_token in GET response!"
    assert get_data["gemini_api_key_masked"] == "AIza...6789"
    assert get_data["custom_token_masked"] == "MySu...n999"

    # Ensure the raw plaintext secrets never appear anywhere in the serialized payload
    assert secret_key not in get_res.text, "Raw secret found in GET response text!"
    assert secret_token not in get_res.text, "Raw token found in GET response text!"
    print("   -> OK! Raw secrets are securely redacted and only masked versions returned.")

    # 6. Test Security: Authentication Guard on Mutating Endpoints
    print("6. Testing Security: Auth Guard on Mutating Endpoints...")
    admin_key = "zenith-test-secret-key-12345"
    settings.ZENITH_ADMIN_KEY = admin_key

    try:
        # A) Request without header -> 401 Unauthorized
        res_no_auth = client.post("/api/v1/tasks", json={"title": "Unauthorized Task"})
        assert res_no_auth.status_code == 401, f"Expected 401, got {res_no_auth.status_code}"

        # B) Request with invalid header -> 401 Unauthorized
        res_wrong_auth = client.post(
            "/api/v1/tasks",
            json={"title": "Wrong Key Task"},
            headers={"X-Zenith-Key": "wrong-secret"}
        )
        assert res_wrong_auth.status_code == 401, f"Expected 401, got {res_wrong_auth.status_code}"

        # C) Request with valid header -> 201 Created
        res_valid_auth = client.post(
            "/api/v1/tasks",
            json={"title": "Authorized Task"},
            headers={"X-Zenith-Key": admin_key}
        )
        assert res_valid_auth.status_code == 201, f"Expected 201, got {res_valid_auth.status_code}"
        auth_task_id = res_valid_auth.json()["data"]["id"]

        # D) Mutating PUT/PATCH/DELETE require auth
        res_patch_no_auth = client.patch(f"/api/v1/tasks/{auth_task_id}/toggle")
        assert res_patch_no_auth.status_code == 401

        res_patch_auth = client.patch(
            f"/api/v1/tasks/{auth_task_id}/toggle",
            headers={"X-Zenith-Key": admin_key}
        )
        assert res_patch_auth.status_code == 200

        res_del_auth = client.delete(
            f"/api/v1/tasks/{auth_task_id}",
            headers={"X-Zenith-Key": admin_key}
        )
        assert res_del_auth.status_code == 200

        # E) Read-only endpoint remains accessible without header
        res_get = client.get("/api/v1/tasks")
        assert res_get.status_code == 200

        print("   -> OK! Auth guard enforces X-Zenith-Key on mutating routes while keeping GET open.")
    finally:
        # Reset settings
        settings.ZENITH_ADMIN_KEY = None

    # 7. Test CORS Configuration
    print("7. Testing CORS configuration logic...")
    from starlette.middleware.cors import CORSMiddleware
    cors_mw = None
    for middleware in app.user_middleware:
        if middleware.cls == CORSMiddleware:
            cors_mw = middleware
            break
    assert cors_mw is not None, "CORSMiddleware not found in app"
    origins = cors_mw.kwargs.get("allow_origins")
    credentials = cors_mw.kwargs.get("allow_credentials", False)
    if isinstance(origins, (list, tuple)) and "*" in origins:
        assert credentials is False, "allow_credentials must be False when allow_origins has '*'"

    # Test actual CORS preflight request
    preflight = client.options(
        "/api/v1/stats",
        headers={
            "Origin": "https://test.example.com",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-credentials") != "true"
    print("   -> OK! CORS middleware configuration is safe and spec-compliant.")

    print("=" * 60)
    print("ALL INTEGRATION & SECURITY TESTS PASSED 100%!")
    print("=" * 60)


if __name__ == "__main__":
    test_system()
