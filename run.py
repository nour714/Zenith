"""
FocusFlow Launcher Script.
Starts the FastAPI application server and automatically opens the browser.
"""
import os
import sys
import time
import webbrowser
from pathlib import Path
import uvicorn

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR / "backend"

# Ensure backend directory is in sys.path
sys.path.insert(0, str(BACKEND_DIR))

HOST = "127.0.0.1"
PORT = 8000
URL = f"http://{HOST}:{PORT}"


def main():
    print("=" * 60)
    print(" 🚀 Zenith - Peak Learning & Smart YouTube Tracker")
    print(f" 🌐 Running on: {URL}")
    print("=" * 60)

    # Open web browser after a short delay
    def open_browser():
        time.sleep(1.2)
        try:
            webbrowser.open(URL)
        except Exception as e:
            print(f"Could not open browser automatically: {e}")

    import threading
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()

    # Start Uvicorn server
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=False,
        app_dir=str(BACKEND_DIR)
    )


if __name__ == "__main__":
    main()
