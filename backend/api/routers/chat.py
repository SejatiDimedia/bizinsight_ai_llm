import asyncio
import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from backend.api.logging_stream import get_logs_history, sse_log_generator
from backend.api.schemas import (
    ChatHistoryResponse,
    ChatMessageItem,
    ChatRequest,
    ChatResponse,
    LogsResponse,
    ResetRequest,
    ResetResponse,
    SessionListResponse,
    SessionSummary,
)
from backend.core.framework import BIAgentFramework, serialize_plotly_figure

router = APIRouter(tags=["Chat & AI Agents"])
logger = logging.getLogger("BizInsight.ChatRouter")

# Global Framework instance
framework = BIAgentFramework()


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


@router.get("/chat/history", response_model=ChatHistoryResponse)
def get_chat_history(session_id: str = Query(default="default", description="ID sesi percakapan")):
    """Mengambil riwayat percakapan lengkap (bubble chat, SQL, data, chart) untuk session_id."""
    messages_raw = framework.get_session_history(session_id)
    items = [ChatMessageItem(**m) for m in messages_raw]
    return ChatHistoryResponse(
        success=True,
        session_id=session_id,
        messages=items
    )


@router.get("/chat/sessions", response_model=SessionListResponse)
def get_all_sessions():
    """Mengambil daftar seluruh sesi percakapan aktif beserta ringkasannya."""
    sessions_raw = framework.get_all_sessions()
    items = [SessionSummary(**s) for s in sessions_raw]
    return SessionListResponse(
        success=True,
        sessions=items
    )


@router.delete("/chat/sessions/{session_id}", response_model=ResetResponse)
def delete_session(session_id: str):
    """Menghapus sesi percakapan secara permanen."""
    framework.delete_session(session_id)
    return ResetResponse(
        success=True,
        session_id=session_id,
        message=f"Sesi '{session_id}' berhasil dihapus."
    )


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
