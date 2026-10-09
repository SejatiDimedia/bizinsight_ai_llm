"""
Entry point for BizInsight AI Backend API.
Delegates to the modular backend package (backend.main:app).
"""
import uvicorn
from backend.config import settings
from backend.main import app

__all__ = ["app"]

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
