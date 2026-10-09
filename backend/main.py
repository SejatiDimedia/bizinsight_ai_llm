import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.logging_stream import setup_api_logging
from backend.api.routers import chat_router, database_router, metrics_router
from backend.config import settings
from backend.database.connection import close_pool, init_connection_pool

# Pasang logging stream SSE
setup_api_logging()
logger = logging.getLogger("BizInsight.Main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager untuk startup dan shutdown aplikasi."""
    logger.info("BizInsight AI API starting up...")
    init_connection_pool()
    yield
    logger.info("BizInsight AI API shutting down...")
    close_pool()


# Inisialisasi FastAPI
app = FastAPI(
    title="BizInsight AI API",
    description="Backend API untuk Autonomous Business Intelligence Multi-Agent System",
    version="1.0.0",
    lifespan=lifespan,
)

# Konfigurasi CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Daftarkan Router Modular
app.include_router(chat_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")
app.include_router(database_router, prefix="/api")


@app.get("/", tags=["General"])
def root():
    """Informasi dasar dan status API."""
    return {
        "service": "BizInsight AI API",
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
