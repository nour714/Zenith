"""
End-to-End API Integration Verification Test Suite.
Run with: python backend/tests/test_api.py
"""
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_system():
    print("=" * 50)
    print("FocusFlow E2E Integration Tests")
    print("=" * 50)

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

    # 3. Test Task Creation
    print("3. Testing POST /api/v1/tasks...")
    task_payload = {
        "title": "مراجعة كود مشروع يوتيوب",
        "description": "فحص معمارية الكود النظيف",
        "priority": "high",
        "category": "study"
    }
    res = client.post("/api/v1/tasks", json=task_payload)
    assert res.status_code == 201, f"Create task failed: {res.text}"
    task_id = res.json()["data"]["id"]
    print(f"   -> OK! Task created with ID: {task_id}")

    # 4. Test Task Toggle
    print("4. Testing PATCH /api/v1/tasks/{id}/toggle...")
    res = client.patch(f"/api/v1/tasks/{task_id}/toggle")
    assert res.status_code == 200
    is_completed = res.json()["data"]["is_completed"]
    print(f"   -> OK! Task toggled to completed: {is_completed}")

    # 5. Test Note Creation
    print("5. Testing POST /api/v1/notes...")
    note_payload = {
        "title": "ملاحظات الدرس الأول",
        "content": "## المفاهيم الأساسية\n- فهم المتغيرات\n- الحلقات التكرارية"
    }
    res = client.post("/api/v1/notes", json=note_payload)
    assert res.status_code == 201
    note_id = res.json()["data"]["id"]
    print(f"   -> OK! Note created with ID: {note_id}")

    # 6. Test Settings
    print("6. Testing GET and POST /api/v1/settings...")
    res = client.post("/api/v1/settings", json={"settings": {"theme": "dark"}})
    assert res.status_code == 200
    res = client.get("/api/v1/settings")
    assert res.status_code == 200
    print("   -> OK! Settings verified.")

    print("=" * 50)
    print("ALL TESTS PASSED 100%!")
    print("=" * 50)


if __name__ == "__main__":
    test_system()
