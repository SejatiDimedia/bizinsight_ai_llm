import json
import os
from typing import Any, Dict, List, Union
from dotenv import load_dotenv
from litellm import completion

from agents.agent import Agent

load_dotenv(override=True)


class AnalystAgent(Agent):
    """
    Agen spesialis Business Intelligence Analyst.
    Mengubah angka mentah dan tabel database menjadi narasi wawasan bisnis,
    analisis komparatif, dan rekomendasi keputusan yang actionable.
    """

    name = "Analyst Agent"
    color = Agent.BLUE  # Warna Blue terminal untuk analisis data

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
        """Memanggil LLM dengan auto-failover ke model cadangan jika terjadi kendala."""
        last_error = None
        for model in self.models_to_try:
            try:
                self.log(f"Mencoba memanggil model: {model}...")
                response = completion(
                    model=model,
                    messages=messages,
                    temperature=0.3,  # Suhu sedang agar ulasan analitis tetap kaya namun faktual
                )
                content = response.choices[0].message.content or ""
                self.log(f"Respon analisis berhasil diterima dari: {model}")
                return content.strip()
            except Exception as e:
                self.log(f"⚠️ Model {model} gagal ({e.__class__.__name__}). Beralih ke fallback...")
                last_error = e

        raise RuntimeError(f"Semua model LLM gagal dihubungi. Error terakhir: {last_error}")

    def analyze(self, data: Union[str, Dict[str, Any]], context: str = "") -> str:
        """
        Menganalisis data query dan menghasilkan ringkasan eksekutif serta rekomendasi bisnis.
        data: bisa berupa string JSON atau dictionary hasil QueryResult.
        context: pertanyaan atau topik spesifik dari pengguna.
        """
        self.log(f"Menganalisis data untuk konteks: '{context}'")

        # Pastikan data dalam format string JSON
        if isinstance(data, dict):
            formatted_data = json.dumps(data, ensure_ascii=False, indent=2)
        else:
            formatted_data = str(data)

        system_prompt = """Anda adalah Senior Head of Business Intelligence & Commercial Analytics di perusahaan e-commerce Indonesia.
Tugas Anda adalah membaca data numerik hasil query database dan menyusun laporan eksekutif bisnis yang tajam, profesional, dan actionable.

PANDUAN FORMAT & ANALISIS BISNIS:
1. 📌 **Ringkasan Eksekutif**: Sebutkan angka total, rata-rata, atau temuan kunci utama secara lugas dengan format mata uang Rupiah standar (contoh: Rp 145.000.000) dan persentase jika relevan.
2. 📊 **Rincian Data Komparatif (Tabel Markdown)**: Jika data mencakup beberapa entitas/baris (kategori, produk, wilayah, tren bulan), WAJIB sajikan data tersebut dalam bentuk Tabel Markdown GFM yang rapi dengan kolom: No, Nama Entitas, Metrik Utama, dan Kontribusi %. Rata-kanankan kolom angka numerik.
3. 💡 **Sorotan Tren & Komparasi**: Bandingkan perbedaan antar kategori/wilayah atau perubahan periode waktu. Sebutkan pola dominasi atau kesenjangan performa yang terlihat.
4. 🎯 **Rekomendasi Bisnis Konkret (Actionable Advice)**: Berikan 1-3 langkah taktis terukur yang bisa dieksekusi tim bisnis (misal: penyesuaian inventory, promosi bundling, evaluasi diskon, penetrasi wilayah).
5. **Format & Gaya Bahasa**:
   - Gunakan Bahasa Indonesia profesional, ringkas, dan persuasif.
   - Jangan menyebutkan istilah teknis database seperti "query SQL", "SELECT", "tabel database", atau "join". Bicaralah murni dalam bahasa bisnis komersial.
   - Jangan gunakan karakter em dash ('—'). Gunakan tanda strip biasa ('-').
"""

        user_prompt = f"""Konteks Pertanyaan Bisnis: {context}

Data Hasil Query Database:
{formatted_data}

Silakan susun analisis bisnis eksekutif berdasarkan data di atas:"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            summary = self._call_llm(messages)
            return summary
        except Exception as e:
            self.log(f"❌ Gagal menganalisis data: {e}")
            return f"Terjadi kendala saat menganalisis data: {str(e)}"


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    print("🧪 Menguji AnalystAgent secara mandiri...")
    analyst = AnalystAgent()

    # Simulasi data mentah dari database
    sample_data = {
        "columns": ["kategori", "total_penjualan_rp", "total_unit_terjual"],
        "rows": [
            ["Elektronik", 145000000.0, 32],
            ["Fashion", 82500000.0, 260],
            ["Kecantikan & Perawatan", 45200000.0, 480],
            ["Makanan & Minuman", 28400000.0, 710],
            ["Rumah Tangga", 21800000.0, 95],
        ],
        "row_count": 5,
        "execution_time_ms": 14.5,
    }

    test_context = "Analisis kinerja kategori produk tahun 2026"
    print(f"\n📊 Mengirim data simulasi: {test_context}\n")

    insight = analyst.analyze(sample_data, context=test_context)
    print("\n💡 Hasil Analisis Bisnis:\n")
    print(insight)