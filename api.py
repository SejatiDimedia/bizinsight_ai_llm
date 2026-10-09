import asyncio
import collections
import json
import logging
import queue
import sys
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

# Muat variabel environment
load_dotenv(override=True)

from contextlib import asynccontextmanager

# =============================================================================
# 📜 LOGGING & REAL-TIME LOG STREAMING (SSE)
# =============================================================================

recent_logs = collections.deque(maxlen=200)
subscribers_lock = threading.Lock()
active_subscribers: List[queue.Queue] = []


class APILogHandler(logging.Handler):
    """Logging handler untuk mengalirkan log agen ke in-memory buffer dan queue subscribers."""
    def emit(self, record):
        try:
            msg = self.format(record)
            recent_logs.append(msg)
            with subscribers_lock:
                for sub_q in list(active_subscribers):
                    try:
                        sub_q.put_nowait(msg)
                    except queue.Full:
                        pass
        except Exception:
            self.handleError(record)


# Setup log formatting
api_log_handler = APILogHandler()
formatter = logging.Formatter("[%(asctime)s] [%(name)s] %(message)s", datefmt="%H:%M:%S")
api_log_handler.setFormatter(formatter)
logging.getLogger().addHandler(api_log_handler)
logger = logging.getLogger("BizInsight.API")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager untuk inisialisasi & shutdown server."""
    logger.info("BizInsight API Server started successfully.")
    yield
    logger.info("BizInsight API Server shutting down.")


# Inisialisasi FastAPI
app = FastAPI(
    title="BizInsight AI API",
    description="Backend API untuk Autonomous Business Intelligence Multi-Agent System",
    version="1.0.0",
    lifespan=lifespan,
)

# Konfigurasi CORS agar frontend React (Vite / localhost) dapat mengakses API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Memungkinkan akses dari semua origin pada mode development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# 🤖 ORCHESTRATOR FRAMEWORK
# =============================================================================

from bi_agent_framework import BIAgentFramework
import db

framework = BIAgentFramework()


def serialize_plotly_figure(fig: Any) -> Optional[Dict[str, Any]]:
    """Mengonversi objek Plotly Figure menjadi dictionary JSON yang aman untuk frontend React."""
    if fig is None:
        return None
    try:
        if hasattr(fig, "to_dict"):
            return fig.to_dict()
        elif hasattr(fig, "to_json"):
            return json.loads(fig.to_json())
    except Exception as e:
        logger.warning(f"Gagal mengonversi Plotly figure ke dict: {e}")
    return None


# =============================================================================
# 📦 REQUEST & RESPONSE MODELS
# =============================================================================

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Pertanyaan bisnis dalam bahasa natural")
    session_id: str = Field(default="default", description="ID sesi percakapan untuk context memory")


class ResetRequest(BaseModel):
    session_id: str = Field(default="default", description="ID sesi percakapan yang ingin direset")


# =============================================================================
# 🌐 API ENDPOINTS
# =============================================================================

@app.get("/")
def root():
    """Informasi dasar dan status API."""
    return {
        "service": "BizInsight AI API",
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }


@app.get("/api/health")
def health_check():
    """Pemeriksaan status kesehatan server dan koneksi database PostgreSQL."""
    db_status = False
    db_error = None
    try:
        test_res = db.execute_query("SELECT 1 as ping;")
        if "rows" in test_res and not test_res.get("error"):
            db_status = True
        else:
            db_error = test_res.get("error")
    except Exception as e:
        db_error = str(e)

    return {
        "status": "healthy" if db_status else "degraded",
        "database_connected": db_status,
        "database_error": db_error,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Endpoint utama percakapan BI:
    Menerima pertanyaan bisnis, menjalankan ReAct Multi-Agent Loop,
    dan mengembalikan jawaban teks, SQL query, raw data tabel, dan konfigurasi chart.
    """
    try:
        # Jalankan eksekusi multi-agent di threadpool agar tidak memblokir event loop
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            framework.ask,
            req.message,
            req.session_id
        )

        # Serialisasi objek grafik Plotly jika ada
        chart_data = serialize_plotly_figure(result.get("figure"))

        return {
            "success": True,
            "session_id": req.session_id,
            "reply": result.get("reply", ""),
            "sql_query": result.get("sql_query", ""),
            "raw_data": result.get("raw_data"),
            "chart": chart_data,
            "chart_type": result.get("chart_type", "none")
        }
    except Exception as e:
        logger.error(f"Error saat memproses chat [{req.session_id}]: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "session_id": req.session_id,
                "error": str(e),
                "reply": f"Maaf, terjadi kesalahan saat memproses permintaan: {str(e)}"
            }
        )


@app.get("/api/stats")
async def get_stats():
    """Mengembalikan ringkasan statistik metrik bisnis (omset, produk, pelanggan, pesanan)."""
    try:
        loop = asyncio.get_running_loop()
        stats = await loop.run_in_executor(None, framework.get_stats_summary)
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error saat mengambil statistik: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tables/{table_name}")
async def get_sample_data(table_name: str, limit: int = Query(default=10, ge=1, le=100)):
    """Mengambil sampel data dari tabel database tertentu."""
    try:
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(None, framework.get_sample_data, table_name, limit)
        if "error" in res:
            raise HTTPException(status_code=400, detail=res["error"])
        return {
            "success": True,
            "table": table_name,
            "limit": limit,
            "data": res
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saat membaca tabel {table_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schema")
async def get_schema():
    """Mengembalikan skema DDL lengkap dari database PostgreSQL."""
    try:
        loop = asyncio.get_running_loop()
        schema_ddl = await loop.run_in_executor(None, framework.get_db_schema)
        return {
            "success": True,
            "schema": schema_ddl
        }
    except Exception as e:
        logger.error(f"Error saat membaca skema database: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/reset")
def reset_chat_session(req: ResetRequest):
    """Mereset histori percakapan untuk session tertentu."""
    try:
        framework.reset_session(req.session_id)
        return {
            "success": True,
            "session_id": req.session_id,
            "message": f"Sesi percakapan '{req.session_id}' berhasil direset."
        }
    except Exception as e:
        logger.error(f"Error saat mereset sesi {req.session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/logs")
def get_recent_logs():
    """Mengambil histori log terbaru agen (berguna untuk polling atau inisialisasi terminal UI)."""
    return {
        "success": True,
        "logs": list(recent_logs)
    }


@app.get("/api/logs/stream")
async def stream_logs(request: Request):
    """
    Streaming log aktivitas agen secara real-time menggunakan Server-Sent Events (SSE).
    Dapat dikonsumsi langsung oleh EventSource di browser / React.
    """
    sub_queue: queue.Queue = queue.Queue(maxsize=100)
    with subscribers_lock:
        active_subscribers.append(sub_queue)

    async def event_generator():
        loop = asyncio.get_running_loop()
        try:
            # Kirim log historis terkini terlebih dahulu
            for past_log in list(recent_logs)[-20:]:
                yield {"data": json.dumps({"log": past_log})}

            while True:
                if await request.is_disconnected():
                    break

                try:
                    # Ambil log baru dari thread-safe queue dengan timeout 2 detik
                    msg = await loop.run_in_executor(None, sub_queue.get, True, 2.0)
                    yield {"data": json.dumps({"log": msg})}
                except queue.Empty:
                    continue
        finally:
            with subscribers_lock:
                if sub_queue in active_subscribers:
                    active_subscribers.remove(sub_queue)

    return EventSourceResponse(event_generator(), ping=15)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=True)
