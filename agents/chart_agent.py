import json
import os
import re
from typing import Any, Dict, List, Optional, Union
from dotenv import load_dotenv
from litellm import completion
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from agents.agent import Agent
from agents.models import ChartConfig

load_dotenv(override=True)


class ChartAgent(Agent):
    """
    Agen spesialis Visualisasi Data.
    Menganalisis karakteristik data hasil query, menentukan jenis visualisasi
    yang optimal (Bar, Line, Pie, Scatter, dll), dan merender objek Plotly Figure.
    """

    name = "Chart Agent"
    color = Agent.MAGENTA  # Warna Magenta terminal untuk visualisasi

    FALLBACK_MODELS = [
        "gemini/gemini-3.6-flash",
        "groq/openai/gpt-oss-120b",
        "gemini/gemini-3.1-flash-lite",
        "groq/openai/gpt-oss-20b",
    ]

    def __init__(self):
        self.primary_model = os.getenv("PRIMARY_MODEL", "gemini/gemini-3.6-flash")

        # Susun rantai failover model LLM
        self.models_to_try = [self.primary_model]
        for m in self.FALLBACK_MODELS:
            if m not in self.models_to_try:
                self.models_to_try.append(m)

        self.log(f"Inisialisasi berhasil dengan {len(self.models_to_try)} failover models.")

    def _call_llm(self, messages: List[Dict[str, str]]) -> str:
        """Memanggil LLM dengan failover otomatis."""
        last_error = None
        for model in self.models_to_try:
            try:
                self.log(f"Mencoba memanggil model: {model}...")
                response = completion(
                    model=model,
                    messages=messages,
                    temperature=0.1,  # Suhu rendah agar pemilihan kolom dan tipe chart deterministik
                )
                content = response.choices[0].message.content or ""
                return content.strip()
            except Exception as e:
                self.log(f"⚠️ Model {model} gagal ({e.__class__.__name__}). Beralih ke fallback...")
                last_error = e

        raise RuntimeError(f"Semua model LLM gagal dihubungi: {last_error}")

    def select_chart_config(
        self,
        columns: List[str],
        sample_rows: List[List[Any]],
        context: str = ""
    ) -> Optional[ChartConfig]:
        """
        Menggunakan LLM untuk menganalisis kolom & sampel data, lalu menentukan
        tipe chart terbaik, kolom sumbu X, dan kolom sumbu Y.
        """
        # Jika data kosong atau hanya 1 baris dengan 1 kolom (single scalar), tidak perlu chart
        if not sample_rows or (len(sample_rows) == 1 and len(columns) == 1):
            self.log("Data berupa nilai tunggal/kosong, melewati pembuatan chart.")
            return None

        system_prompt = """Anda adalah Senior Data Visualization Engineer.
Tugas Anda adalah memilih visualisasi chart terbaik untuk menyajikan data bisnis secara jelas dan elegan.

LOGIKA PEMILIHAN TIPE CHART:
- 'bar': Cocok untuk komparasi data kategorikal (contoh: penjualan per kategori, top produk, performa wilayah).
- 'line': Cocok untuk tren berbasis waktu (contoh: tanggal, bulan, tahun, tren penjualan harian/bulanan).
- 'pie': Cocok untuk komposisi proporsi / persentase dari total (hanya jika kategori <= 7).
- 'scatter': Cocok untuk korelasi antara 2 metrik numerik kontinu (contoh: harga vs penjualan).
- 'none': Gunakan jika data berupa tabel teks panjang, daftar alamat, atau tidak cocok dijadikan chart.

ATURAN OUTPUT:
Kembalikan HANYA format JSON valid tanpa markdown (tanpa ```json), dengan struktur:
{
  "chart_type": "bar | line | pie | scatter | none",
  "title": "Judul visualisasi yang jelas dan profesional",
  "x_label": "Label sumbu X",
  "y_label": "Label sumbu Y",
  "x_column": "Nama persis kolom yang menjadi sumbu X atau label",
  "y_columns": ["Nama persis kolom numerik untuk sumbu Y atau metrik"]
}
"""

        user_content = f"""Konteks Analisis: {context}
Daftar Kolom: {columns}
Sampel Data (3-5 baris pertama):
{sample_rows[:5]}

Tentukan konfigurasi chart terbaik:"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        try:
            raw_response = self._call_llm(messages)

            # Bersihkan markdown formatting jika ada
            cleaned_json = raw_response
            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_response, re.DOTALL)
            if match:
                cleaned_json = match.group(1)
            else:
                cleaned_json = cleaned_json.strip("`").strip()

            data = json.loads(cleaned_json)
            chart_type = data.get("chart_type", "none").lower()

            if chart_type == "none":
                return None

            # Validasi nama kolom yang dipilih benar-benar ada di daftar columns
            x_col = data.get("x_column", "")
            if x_col not in columns and columns:
                x_col = columns[0]

            y_cols = [c for c in data.get("y_columns", []) if c in columns]
            if not y_cols and len(columns) > 1:
                y_cols = [columns[1]]

            config = ChartConfig(
                chart_type=chart_type,
                title=data.get("title", "Visualisasi Data Bisnis"),
                x_label=data.get("x_label", x_col),
                y_label=data.get("y_label", y_cols[0] if y_cols else ""),
                x_column=x_col,
                y_columns=y_cols,
            )
            self.log(f"Chart Terpilih: {config.chart_type.upper()} | Title: '{config.title}'")
            return config

        except Exception as e:
            self.log(f"⚠️ Gagal menentukan config chart via LLM: {e}. Mengabaikan visualisasi.")
            return None

    def render_figure(
        self,
        columns: List[str],
        rows: List[List[Any]],
        config: ChartConfig
    ) -> Optional[go.Figure]:
        """Membangun objek Plotly Figure interaktif berdasarkan ChartConfig."""
        if not rows or not config:
            return None

        try:
            df = pd.DataFrame(rows, columns=columns)

            # Pastikan tipe numerik dikonversi dengan aman
            for col in config.y_columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

            fig = None
            palette = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"]

            # 1. Bar Chart
            if config.chart_type == "bar":
                fig = px.bar(
                    df,
                    x=config.x_column,
                    y=config.y_columns[0] if len(config.y_columns) == 1 else config.y_columns,
                    title=config.title,
                    labels={config.x_column: config.x_label, config.y_columns[0]: config.y_label},
                    color_discrete_sequence=palette,
                    barmode="group",
                )
                fig.update_traces(marker_line_width=1, opacity=0.9)

            # 2. Line Chart
            elif config.chart_type == "line":
                fig = px.line(
                    df,
                    x=config.x_column,
                    y=config.y_columns[0] if len(config.y_columns) == 1 else config.y_columns,
                    title=config.title,
                    markers=True,
                    labels={config.x_column: config.x_label, config.y_columns[0]: config.y_label},
                    color_discrete_sequence=palette,
                )

            # 3. Pie Chart
            elif config.chart_type == "pie":
                val_col = config.y_columns[0] if config.y_columns else columns[1]
                fig = px.pie(
                    df,
                    names=config.x_column,
                    values=val_col,
                    title=config.title,
                    color_discrete_sequence=palette,
                    hole=0.35,  # Donut style modern
                )

            # 4. Scatter Plot
            elif config.chart_type == "scatter":
                fig = px.scatter(
                    df,
                    x=config.x_column,
                    y=config.y_columns[0],
                    title=config.title,
                    labels={config.x_column: config.x_label, config.y_columns[0]: config.y_label},
                    color_discrete_sequence=palette,
                )

            if fig:
                # Tampilan styling modern & bersih
                fig.update_layout(
                    template="plotly_white",
                    font=dict(family="Inter, -apple-system, sans-serif", size=12),
                    title_font=dict(size=15, color="#1e293b"),
                    margin=dict(l=40, r=40, t=50, b=40),
                    legend_title_text="",
                    hovermode="closest",
                )

            return fig

        except Exception as e:
            self.log(f"❌ Gagal merender figure Plotly: {e}")
            return None

    def create_chart(
        self,
        data: Union[Dict[str, Any], List[Any], str],
        context: str = ""
    ) -> Dict[str, Any]:
        """
        Pipeline lengkap pembuatan chart yang fleksibel:
        Mendukung List of Dicts, QueryResult Dict, maupun string JSON.
        """
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except Exception:
                return {"success": False, "error": "Format data JSON tidak valid"}

        columns = []
        rows = []

        # Kasus 1: LLM mengirim dalam format List of Dicts: [{"col1": val1, "col2": val2}, ...]
        if isinstance(data, list):
            if data and isinstance(data[0], dict):
                columns = list(data[0].keys())
                rows = [[item.get(col) for col in columns] for item in data]
            elif data and isinstance(data[0], list):
                columns = [f"col_{i+1}" for i in range(len(data[0]))]
                rows = data

        # Kasus 2: Data berbentuk Dictionary
        elif isinstance(data, dict):
            # Jika nested di bawah key 'result' (dari SQLAgent)
            if "result" in data and isinstance(data["result"], dict):
                columns = data["result"].get("columns", [])
                rows = data["result"].get("rows", [])
            else:
                columns = data.get("columns", [])
                rows = data.get("rows", [])

        if not columns or not rows:
            return {"success": False, "message": "Tidak ada data untuk divisualisasikan"}

        config = self.select_chart_config(columns, rows, context=context)
        if not config:
            return {"success": True, "chart_type": "none", "figure": None}

        fig = self.render_figure(columns, rows, config)
        return {
            "success": True,
            "chart_type": config.chart_type,
            "title": config.title,
            "figure": fig,
            "config": config.model_dump(),
        }


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    print("🧪 Menguji ChartAgent secara mandiri...")
    agent = ChartAgent()

    # Data uji: Tren Penjualan Bulanan 2026
    sample_trend_data = {
        "columns": ["bulan", "total_omset"],
        "rows": [
            ["Jan 2026", 45000000],
            ["Feb 2026", 52000000],
            ["Mar 2026", 88000000],  # Ramadan
            ["Apr 2026", 96000000],  # Lebaran
            ["Mei 2026", 59000000],
            ["Jun 2026", 71000000],
            ["Jul 2026", 74000000],
            ["Agu 2026", 85000000],  # Promo Kemerdekaan
        ],
    }

    test_context = "Tampilkan tren penjualan bulanan dari Januari hingga Agustus 2026"
    print(f"\n📊 Menguji dengan data tren: '{test_context}'\n")

    result = agent.create_chart(sample_trend_data, context=test_context)
    print("\n📈 Hasil ChartAgent:")
    print(f"  • Sukses     : {result.get('success')}")
    print(f"  • Tipe Chart : {result.get('chart_type')}")
    print(f"  • Judul      : {result.get('title')}")
    print(f"  • Figure Obj : {type(result.get('figure'))}")