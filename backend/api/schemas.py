from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# =============================================================================
# 💬 CHAT & CONVERSATION SCHEMAS
# =============================================================================

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Pertanyaan bisnis pengguna dalam bahasa natural")
    session_id: str = Field(default="default", description="ID sesi percakapan untuk context memory")


class ChatResponse(BaseModel):
    success: bool = Field(..., description="Status keberhasilan pemrosesan")
    session_id: str = Field(..., description="ID sesi percakapan")
    reply: str = Field(..., description="Jawaban analisis bisnis dari AI")
    sql_query: str = Field(default="", description="Query SQL yang dieksekusi")
    raw_data: Optional[Dict[str, Any]] = Field(default=None, description="Data tabel mentah hasil query")
    chart: Optional[Dict[str, Any]] = Field(default=None, description="Konfigurasi dan data grafik Plotly dalam format JSON dict")
    chart_type: str = Field(default="none", description="Tipe visualisasi chart (bar, line, pie, dll)")
    error: Optional[str] = Field(default=None, description="Pesan error jika pemrosesan gagal")


class ResetRequest(BaseModel):
    session_id: str = Field(default="default", description="ID sesi percakapan yang ingin direset")


class ResetResponse(BaseModel):
    success: bool = Field(..., description="Status keberhasilan reset")
    session_id: str = Field(..., description="ID sesi yang direset")
    message: str = Field(..., description="Pesan konfirmasi")


class ChatMessageItem(BaseModel):
    id: str = Field(..., description="ID unik pesan")
    role: str = Field(..., description="Peran: 'user' atau 'assistant'")
    content: Optional[str] = Field(default=None, description="Pesan dari user")
    reply: Optional[str] = Field(default=None, description="Balasan dari asisten AI")
    sql_query: Optional[str] = Field(default=None, description="Query SQL yang dieksekusi")
    raw_data: Optional[Dict[str, Any]] = Field(default=None, description="Data tabel hasil query")
    chart: Optional[Dict[str, Any]] = Field(default=None, description="Data grafik Plotly")
    chart_type: Optional[str] = Field(default="none", description="Tipe visualisasi chart")
    timestamp: str = Field(..., description="Waktu ISO 8601 pesan dikirim")


class ChatHistoryResponse(BaseModel):
    success: bool = Field(..., description="Status keberhasilan")
    session_id: str = Field(..., description="ID sesi percakapan")
    messages: List[ChatMessageItem] = Field(default_factory=list, description="Daftar seluruh pesan dalam sesi")


class SessionSummary(BaseModel):
    session_id: str = Field(..., description="ID unik sesi percakapan")
    title: str = Field(..., description="Judul atau cuplikan pertanyaan pertama sesi")
    message_count: int = Field(..., description="Jumlah pesan dalam sesi")
    last_active: str = Field(..., description="Waktu aktivitas terakhir ISO 8601")


class SessionListResponse(BaseModel):
    success: bool = Field(..., description="Status keberhasilan")
    sessions: List[SessionSummary] = Field(default_factory=list, description="Daftar ringkasan sesi-sesi aktif")


# =============================================================================
# 📊 METRICS & DATABASE SCHEMAS
# =============================================================================

class StatsSummary(BaseModel):
    total_products: int = Field(..., description="Jumlah total produk aktif")
    total_customers: int = Field(..., description="Jumlah total pelanggan terdaftar")
    completed_orders: int = Field(..., description="Jumlah transaksi berstatus completed")
    total_revenue: float = Field(..., description="Total omset pendapatan transaksi selesai (Rp)")


class StatsResponse(BaseModel):
    success: bool = Field(..., description="Status permintaan")
    stats: StatsSummary = Field(..., description="Ringkasan statistik metrik bisnis")


class TableDataResponse(BaseModel):
    success: bool = Field(..., description="Status permintaan")
    table: str = Field(..., description="Nama tabel yang dibaca")
    limit: int = Field(..., description="Batas baris sampel")
    data: Dict[str, Any] = Field(..., description="Struktur kolom dan baris data")


class SchemaResponse(BaseModel):
    success: bool = Field(..., description="Status permintaan")
    schema_ddl: str = Field(..., description="Teks skema DDL tabel-tabel PostgreSQL")


class HealthResponse(BaseModel):
    status: str = Field(..., description="'healthy' jika database terhubung, 'degraded' jika tidak")
    database_connected: bool = Field(..., description="Status konektivitas PostgreSQL")
    database_error: Optional[str] = Field(default=None, description="Pesan error database jika koneksi bermasalah")
    timestamp: str = Field(..., description="Waktu pemeriksaan ISO 8601")


class LogsResponse(BaseModel):
    success: bool = Field(..., description="Status permintaan")
    logs: List[str] = Field(..., description="Daftar entri log aktivitas agen terkini")
