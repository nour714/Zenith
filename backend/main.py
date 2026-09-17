import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure backend directory is in sys.path for serverless and root execution
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import AppBaseException
from app.db.init_db import init_db
from app.api.v1.api import api_router

# Initialize logging
setup_logging()
logger = get_logger("zenith.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handling: initialize database schema on startup."""
    logger.info("Initializing Zenith Application...")
    try:
        init_db()
        logger.info("Database schema verified.")
    except Exception as exc:
        logger.warning(f"Database connection check warning on startup: {exc}")
    yield
    logger.info("Zenith Application shutting down gracefully.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handler for AppBaseException and custom domain errors
@app.exception_handler(AppBaseException)
async def app_exception_handler(request: Request, exc: AppBaseException) -> JSONResponse:
    logger.warning(f"Handled application exception on {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "error": exc.__class__.__name__,
            "details": exc.details
        }
    )


# Unhandled Exception Handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "حدث خطأ غير متوقع في الخادم.",
            "error": exc.__class__.__name__,
            "details": str(exc)
        }
    )


# Include API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    db_ok = False
    db_error = None
    try:
        init_db()
        db_ok = True
    except Exception as exc:
        db_error = str(exc)
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database_configured": bool(settings.DATABASE_URL),
        "database_connected": db_ok,
        "database_error": db_error
    }


# Serve Frontend static assets
frontend_path = settings.FRONTEND_DIR
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
    logger.info(f"Mounted frontend static files from: {frontend_path}")
else:
    logger.warning(f"Frontend directory '{frontend_path}' does not exist yet.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
