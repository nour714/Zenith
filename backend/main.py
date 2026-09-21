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

from fastapi.middleware.gzip import GZipMiddleware
from app.db.session import close_pool, get_db_connection, release_db_connection

# Initialize logging
setup_logging()
logger = get_logger("zenith.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handling: initialize database schema on startup and close pool on shutdown."""
    logger.info("Initializing Zenith Application...")
    try:
        init_db()
        logger.info("Database schema verified.")
    except Exception as exc:
        logger.warning(f"Database connection check warning on startup: {exc}")
    yield
    logger.info("Zenith Application shutting down gracefully.")
    close_pool()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# GZip compression middleware (compresses responses > 1000 bytes)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS configuration
# allow_origins=["*"] combined with allow_credentials=True is invalid per CORS specifications.
# Explicitly support origins from ALLOWED_ORIGINS setting, and disable credentials when using wildcard.
raw_origins = getattr(settings, "ALLOWED_ORIGINS", "*")
if isinstance(raw_origins, str):
    cors_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
else:
    cors_origins = list(raw_origins)

cors_allow_credentials = False if "*" in cors_origins else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_allow_credentials,
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


# Static assets caching headers middleware
@app.middleware("http")
async def add_cache_control_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.startswith(("/css/", "/js/", "/images/", "/icons/")):
        response.headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=604800"
    elif path in ("/", "/index.html", "/manifest.webmanifest"):
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
    return response


# Include API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    db_ok = False
    db_error = None
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
            db_ok = True
        finally:
            release_db_connection(conn)
    except Exception as exc:
        db_error = str(exc)
    return {
        "status": "healthy" if db_ok else "degraded",
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
