import asyncio
import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from backend.api.logging_stream import get_logs_history, sse_log_generator
from backend.api.schemas import (
    ChatRequest,
    ChatResponse,
    LogsResponse,
    ResetRequest,
    ResetResponse,
)
from backend.core.framework import BIAgentFramework

router = APIRouter(tags=["Chat & AI Agents"])
logger = logging.getLogger("BizInsight.ChatRouter")

# Global Framework instance
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


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Endpoint utama percakapan BI:
    Menerima pertanyaan bisnis, menjalankan ReAct Multi-Agent Loop,
    dan mengembalikan jawaban teks, SQL query, raw data tabel, dan konfigurasi chart.
    """
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            framework.ask,
            req.message,
            req.session_id
        )

        chart_data = serialize_plotly_figure(result.get("figure"))

        return ChatResponse(
            success=True,
            session_id=req.session_id,
            reply=result.get("reply", ""),
            sql_query=result.get("sql_query", ""),
            raw_data=result.get("raw_data"),
            chart=chart_data,
            chart_type=result.get("chart_type", "none")
        )
    except Exception as e:
        logger.error(f"Error chat [{req.session_id}]: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "session_id": req.session_id,
                "reply": f"Terjadi kesalahan saat memproses pertanyaan: {str(e)}",
                "sql_query": "",
                "raw_data": None,
                "chart": None,
                "chart_type": "none",
                "error": str(e)
            }
        )


@router.post("/chat/reset", response_model=ResetResponse)
def reset_session(req: ResetRequest):
    """Mereset riwayat percakapan dan cache artefak untuk session_id tertentu."""
    try:
        framework.reset_session(req.session_id)
        return ResetResponse(
            success=True,
            session_id=req.session_id,
            message=f"Sesi percakapan '{req.session_id}' berhasil direset."
        )
    except Exception as e:
        logger.error(f"Error resetting session {req.session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs", response_model=LogsResponse)
def get_logs():
    """Mengambil riwayat log terbaru dari aktivitas agen."""
    return LogsResponse(
        success=True,
        logs=get_logs_history()
    )


@router.get("/logs/stream")
async def stream_logs(request: Request):
    """
    Streaming log aktivitas agen secara real-time via Server-Sent Events (SSE).
    Dapat dikonsumsi langsung oleh browser EventSource di React.
    """
    return EventSourceResponse(sse_log_generator(request), ping=15)
