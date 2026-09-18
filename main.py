"""
Zenith Root ASGI Entrypoint.
Allows running `uvicorn main:app` directly from the project workspace root.
"""
import sys
from pathlib import Path

# Ensure both workspace root and backend directory are in sys.path
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Import FastAPI application instance
from backend.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
