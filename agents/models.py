from typing import Any, List, Optional
from pydantic import BaseModel, Field


class SQLQuery(BaseModel):
    """Data contract untuk SQL query yang di-generate oleh LLM dari pertanyaan user."""
    query: str = Field(
        description="Query string PostgreSQL yang valid (hanya SELECT/WITH)"
    )
    explanation: str = Field(
        description="Penjelasan ringkas dalam bahasa manusia mengenai apa yang dicari oleh query ini"
    )
    is_safe: bool = Field(
        default=True,
        description="True jika query murni SELECT tanpa mutasi (INSERT/UPDATE/DELETE/DROP)"
    )


class QueryResult(BaseModel):
    """Data contract untuk hasil eksekusi SQL query ke PostgreSQL."""
    columns: List[str] = Field(
        description="Daftar nama kolom hasil query"
    )
    rows: List[List[Any]] = Field(
        description="Baris-baris data hasil query"
    )
    row_count: int = Field(
        description="Jumlah total baris yang dikembalikan"
    )
    execution_time_ms: float = Field(
        description="Waktu eksekusi query dalam milidetik"
    )


class ChartConfig(BaseModel):
    """Data contract untuk konfigurasi visualisasi chart yang dipilih LLM."""
    chart_type: str = Field(
        description="Tipe visualisasi: bar | line | pie | scatter | heatmap | none"
    )
    title: str = Field(
        description="Judul chart yang deskriptif dan profesional"
    )
    x_label: str = Field(
        default="",
        description="Label deskripsi sumbu X"
    )
    y_label: str = Field(
        default="",
        description="Label deskripsi sumbu Y"
    )
    x_column: str = Field(
        description="Nama kolom data yang dijadikan sumbu X atau label kategori"
    )
    y_columns: List[str] = Field(
        description="Daftar nama kolom data numerik untuk sumbu Y atau nilai metrik"
    )


class BIInsight(BaseModel):
    """Data contract untuk satu siklus lengkap jawaban Business Intelligence."""
    question: str = Field(
        description="Pertanyaan asli dari pengguna"
    )
    sql_query: str = Field(
        description="SQL query yang dieksekusi"
    )
    summary: str = Field(
        description="Ringkasan analisis bisnis dan rekomendasi aksi dari LLM"
    )
    chart: Optional[ChartConfig] = Field(
        default=None,
        description="Konfigurasi visualisasi chart (None jika data tidak cocok divisualisasikan)"
    )
    raw_data: QueryResult = Field(
        description="Data mentah hasil query dari database"
    )