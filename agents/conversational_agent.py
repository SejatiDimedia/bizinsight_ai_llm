import contextvars
import json
import os
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from litellm import completion

from agents.agent import Agent
from agents.analyst_agent import AnalystAgent
from agents.chart_agent import ChartAgent
from agents.sql_agent import SQLAgent

load_dotenv(override=True)

# ContextVar untuk mengisolasi session_id secara thread-safe saat tool calling dieksekusi
_active_session_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "active_session_ctx", default="default"
)


class ConversationalAgent(Agent):
    """
    Orkestrator Utama ReAct (Reasoning + Acting) Tool Calling Loop.
    Menerima pesan natural language dari pengguna, menalar kebutuhan informasi,
    memanggil tools (SQLAgent, AnalystAgent, ChartAgent) secara dinamis,
    dan mempertahankan histori percakapan per session.
    """

    name = "Conversational Agent"
    color = Agent.GREEN  # Warna Green terminal untuk interaksi user & ReAct loop

    FALLBACK_MODELS = [
        "gemini/gemini-3.6-flash",
        "groq/openai/gpt-oss-120b",
        "gemini/gemini-3.1-flash-lite",
        "groq/openai/gpt-oss-20b",
    ]

    def __init__(
        self,
        sql_agent: Optional[SQLAgent] = None,
        analyst_agent: Optional[AnalystAgent] = None,
        chart_agent: Optional[ChartAgent] = None,
    ):
        self.sql_agent = sql_agent or SQLAgent()
        self.analyst_agent = analyst_agent or AnalystAgent()
        self.chart_agent = chart_agent or ChartAgent()

        self.primary_model = os.getenv("PRIMARY_MODEL", "gemini/gemini-3.6-flash")
        self.models_to_try = [self.primary_model]
        for m in self.FALLBACK_MODELS:
            if m not in self.models_to_try:
                self.models_to_try.append(m)

        # Menyimpan chat history per session_id agar bisa follow-up question
        self.chat_histories: Dict[str, List[Dict[str, Any]]] = {}

        # Cache artefak hasil eksekusi turn per session_id (Thread-safe & Concurrency-safe)
        self.session_artifacts: Dict[str, Dict[str, Any]] = {}

        self.log(f"Inisialisasi berhasil dengan ReAct Tools.")

    @property
    def last_artifacts(self) -> Dict[str, Any]:
        """Backward-compatible property untuk mengakses artefak sesi aktif."""
        s_id = _active_session_ctx.get()
        return self.session_artifacts.get(s_id, {
            "sql_query": "",
            "raw_data": None,
            "figure": None,
            "chart_type": "none",
        })

    @last_artifacts.setter
    def last_artifacts(self, val: Dict[str, Any]):
        s_id = _active_session_ctx.get()
        self.session_artifacts[s_id] = val

    # =========================================================================
    # 🛠️ DAFTAR TOOLS YANG BISA DIPANGGIL LLM
    # =========================================================================

    def tool_query_database(self, question: str) -> str:
        """Tool: Menerjemahkan pertanyaan ke SQL, eksekusi, dan kembalikan hasil data."""
        self.log(f"Tool Query Database dipanggil: '{question}'")
        res = self.sql_agent.text_to_sql_and_execute(question)

        # Simpan SQL dan data mentah ke artefak untuk ditampilkan di dashboard UI
        if res.get("success"):
            self.last_artifacts["sql_query"] = res.get("sql_query", "")
            self.last_artifacts["raw_data"] = res.get("result", {})

        return json.dumps(res, ensure_ascii=False)

    def tool_generate_chart(self, data_json: Any = None, chart_hint: str = "") -> str:
        """Tool: Membuat visualisasi grafik Plotly dari data hasil query."""
        self.log(f"Tool Generate Chart dipanggil. Hint: '{chart_hint}'")

        # Jika data_json kosong, otomatis pakai raw_data dari query SQL terakhir
        data_to_use = data_json
        if (not data_to_use or data_to_use == "{}") and self.last_artifacts.get("raw_data"):
            data_to_use = self.last_artifacts["raw_data"]

        chart_res = self.chart_agent.create_chart(data_to_use, context=chart_hint)

        if chart_res.get("success") and chart_res.get("figure"):
            self.last_artifacts["figure"] = chart_res.get("figure")
            self.last_artifacts["chart_type"] = chart_res.get("chart_type", "none")

        summary_res = {
            "success": chart_res.get("success", False),
            "chart_type": chart_res.get("chart_type", "none"),
            "title": chart_res.get("title", ""),
        }
        return json.dumps(summary_res, ensure_ascii=False)

    def tool_analyze_data(self, data_json: str, context: str = "") -> str:
        """Tool: Menganalisis data angka menjadi ringkasan eksekutif bisnis."""
        self.log(f"Tool Analyze Data dipanggil untuk: '{context}'")
        insight = self.analyst_agent.analyze(data_json, context=context)
        return insight

    # =========================================================================
    # 📋 DEFINISI TOOLS (JSON SCHEMA UNTUK LLM FUNCTION CALLING)
    # =========================================================================

    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "query_database",
                    "description": (
                        "Menerjemahkan pertanyaan bisnis ke query PostgreSQL, mengeksekusinya, "
                        "dan mengembalikan data tabel hasil query. Gunakan ini SETIAP KALI Anda "
                        "membutuhkan data angka, daftar produk, penjualan, customer, dll."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "question": {
                                "type": "string",
                                "description": "Deskripsi data yang ingin diambil dari database",
                            }
                        },
                        "required": ["question"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_chart",
                    "description": (
                        "Membuat grafik visualisasi data interaktif (bar, line, pie, scatter). "
                        "Panggil ini setelah mendapatkan data dari database jika data cocok divisualisasikan."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "data_json": {
                                "type": "string",
                                "description": "String JSON hasil query database yang ingin digambar",
                            },
                            "chart_hint": {
                                "type": "string",
                                "description": "Petunjuk jenis grafik atau judul grafik yang diinginkan",
                            },
                        },
                        "required": ["data_json"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "analyze_data",
                    "description": (
                        "Menganalisis data numerik secara mendalam untuk menghasilkan ringkasan "
                        "eksekutif bisnis dan saran tindakan taktis."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "data_json": {
                                "type": "string",
                                "description": "String JSON data numerik yang akan dianalisis",
                            },
                            "context": {
                                "type": "string",
                                "description": "Konteks pertanyaan bisnis dari pengguna",
                            },
                        },
                        "required": ["data_json"],
                    },
                },
            },
        ]

    # =========================================================================
    # 🔄 REACT LOOP (INTI PERCAKAPAN)
    # =========================================================================

    def chat(self, user_message: str, session_id: str = "default") -> Dict[str, Any]:
        """
        Menjalankan loop ReAct:
        1. LLM menalar apakah perlu memanggil tools.
        2. Eksekusi tool terpilih dan kirim kembali hasilnya.
        3. Maksimal 4 kali iterasi tool calling.
        4. Mengembalikan jawaban final beserta artefak grafik, SQL, dan data tabel.
        """
        token = _active_session_ctx.set(session_id)
        try:
            # Reset artefak untuk sesi dan giliran (turn) ini
            self.session_artifacts[session_id] = {
                "sql_query": "",
                "raw_data": None,
                "figure": None,
                "chart_type": "none",
            }

            # Inisialisasi percakapan untuk session_id jika baru
            if session_id not in self.chat_histories:
                self.chat_histories[session_id] = [
                    {
                        "role": "system",
                        "content": (
                            "Anda adalah 'BizInsight AI', Senior Business Intelligence & Commercial Analytics Specialist "
                            "untuk platform e-commerce Indonesia.\n"
                            "Tugas Anda adalah menyajikan jawaban analitis eksekutif yang tajam, terstruktur, "
                            "dan mudah dipahami oleh manajemen bisnis berdasarkan data nyata dari database PostgreSQL.\n\n"
                            "FORMAT DAN STRUKTUR STANDAR JAWABAN ANDA:\n\n"
                            "1. 📌 **Ringkasan Eksekutif (Executive Summary)**:\n"
                            "   - Berikan kesimpulan langsung terhadap pertanyaan pengguna dalam 1-2 kalimat padat.\n"
                            "   - Sebutkan total keseluruhan atau angka kunci utama dengan format mata uang Rupiah standar (contoh: Rp 791.540.000) atau persentase.\n\n"
                            "2. 📊 **Rincian Data Komparatif (Tabel Markdown)**:\n"
                            "   - JIKA pertanyaan melibatkan rincian produk, kategori, periode bulan/tanggal, wilayah, atau peringkat, WAJIB sajikan data tersebut dalam bentuk **Tabel Markdown GFM** yang rapi.\n"
                            "   - Format tabel harus jelas dengan kolom seperti: | No | Entitas (Kategori / Produk / Wilayah) | Metrik Utama (format IDR atau Unit) | Kontribusi (%) |\n"
                            "   - Gunakan alignment angka rata kanan (| :--- | :--- | ---: |).\n\n"
                            "3. 💡 **Wawasan Bisnis & Analisis Tren (Key Takeaways)**:\n"
                            "   - Berikan 2-3 poin analitis penting (pemenang teratas, kontributor utama, kesenjangan performa, atau pola musiman).\n\n"
                            "4. 🎯 **Rekomendasi Tindakan Strategis (Actionable Advice)**:\n"
                            "   - Berikan 1-3 langkah taktis konkret untuk tim bisnis (misal: penambahan stok item laris, promosi bundling untuk segmen tertinggal, optimasi diskon, dll).\n\n"
                            "ATURAN OPERASIONAL PENTING:\n"
                            "- Selalu panggil tool `query_database` terlebih dahulu untuk mengambil data aktual dari PostgreSQL.\n"
                            "- Jika data memiliki komparasi kategori/wilayah atau dimensi waktu, panggil tool `generate_chart` agar sistem otomatis memuat grafik interaktif di panel visualisasi.\n"
                            "- JANGAN PERNAH menyisipkan tag gambar markdown seperti `![...](attachment://...)` atau `![...](...)`. Grafik interaktif Plotly otomatis dirender secara native di panel visualisasi samping oleh aplikasi.\n"
                            "- Jangan gunakan karakter em dash ('—'). Gunakan strip biasa ('-') atau tanda kurung.\n"
                            "- Gunakan Bahasa Indonesia bisnis yang profesional, lugas, dan terpercaya."
                        ),
                    }
                ]

            history = self.chat_histories[session_id]
            history.append({"role": "user", "content": user_message})

            tools = self.get_tool_definitions()

            # Jaga agar panjang histori tidak membengkak (system prompt + 8 pesan terakhir)
            active_messages = [history[0]] + history[-8:]

            for model in self.models_to_try:
                try:
                    # ReAct Iteration Loop (Maksimal 4 iterasi tool-calling)
                    for step in range(4):
                        self.log(f"ReAct Iterasi #{step + 1} menggunakan {model}...")
                        response = completion(
                            model=model,
                            messages=active_messages,
                            tools=tools,
                            tool_choice="auto",
                        )

                        choice = response.choices[0]
                        msg = choice.message

                        # Kasus 1: LLM selesai dan memberikan jawaban teks langsung ke pengguna
                        if not getattr(msg, "tool_calls", None):
                            final_reply = msg.content or "Selesai dianalisis."
                            history.append({"role": "assistant", "content": final_reply})
                            self.log(f"ReAct Selesai dalam {step + 1} langkah.")
                            artifacts = self.session_artifacts[session_id]
                            return {
                                "reply": final_reply,
                                "sql_query": artifacts["sql_query"],
                                "raw_data": artifacts["raw_data"],
                                "figure": artifacts["figure"],
                                "chart_type": artifacts["chart_type"],
                            }

                        # Kasus 2: LLM memutuskan untuk memanggil satu atau beberapa tools
                        active_messages.append(msg)
                        for tc in msg.tool_calls:
                            fn_name = tc.function.name
                            try:
                                fn_args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                            except Exception:
                                fn_args = {}

                            self.log(f"👉 Tool Call: '{fn_name}' dengan argumen: {fn_args}")

                            # Eksekusi tool yang sesuai
                            if fn_name == "query_database":
                                tool_result = self.tool_query_database(**fn_args)
                            elif fn_name == "generate_chart":
                                tool_result = self.tool_generate_chart(**fn_args)
                            elif fn_name == "analyze_data":
                                tool_result = self.tool_analyze_data(**fn_args)
                            else:
                                tool_result = json.dumps({"error": f"Tool '{fn_name}' tidak dikenal."})

                            active_messages.append({
                                "role": "tool",
                                "tool_call_id": tc.id,
                                "content": tool_result,
                            })

                    # Jika batas 4 langkah terlampaui, paksa LLM merangkum jawaban akhir
                    self.log("Batas 4 iterasi ReAct tercapai, meminta kesimpulan akhir...")
                    final_completion = completion(model=model, messages=active_messages)
                    final_reply = final_completion.choices[0].message.content or "Analisis telah selesai."
                    history.append({"role": "assistant", "content": final_reply})

                    artifacts = self.session_artifacts[session_id]
                    return {
                        "reply": final_reply,
                        "sql_query": artifacts["sql_query"],
                        "raw_data": artifacts["raw_data"],
                        "figure": artifacts["figure"],
                        "chart_type": artifacts["chart_type"],
                    }

                except Exception as e:
                    self.log(f"⚠️ ReAct loop error pada model {model}: {e}. Mencoba fallback berikutnya...")
                    continue

            # Jika semua model failover gagal
            return {
                "reply": "Maaf, terjadi kendala saat menghubungkan ke seluruh model AI. Silakan periksa koneksi atau coba beberapa saat lagi.",
                "sql_query": "",
                "raw_data": None,
                "figure": None,
                "chart_type": "none",
            }
        finally:
            _active_session_ctx.reset(token)


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    print("🧪 Menguji ConversationalAgent (ReAct Loop)...")
    conv_agent = ConversationalAgent()

    test_q = "Kategori produk apa yang memiliki pendapatan tertinggi di tahun 2026?"
    print(f"\n❓ User: '{test_q}'\n")

    res = conv_agent.chat(test_q, session_id="test_session")
    print("\n🤖 AI Reply:\n", res["reply"])
    print("\n🔍 SQL yang Digenerate:\n", res["sql_query"])
    print("\n📊 Chart Type Terbuat:\n", res["chart_type"])