# 🏗️ Architecture Reference — Pola Kode dari AutoBargain AI
# Dokumen ini berisi pattern & code snippet yang WAJIB diikuti saat membangun BizInsight AI.
# Letakkan di root project agar AI coding assistant bisa membacanya sebagai konteks.

---

## 1. BaseAgent Pattern — ANSI Color Logging

Setiap agent harus extend `BaseAgent` yang menyediakan logging berwarna per agen.

```python
# agents/agent.py

import logging

class Agent:
    """
    Abstract Superclass untuk semua Agen di BizInsight AI.
    Menangani standardisasi format logging dengan kode warna ANSI terminal unik per agen.
    """

    # Foreground ANSI Colors
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'
    WHITE = '\033[37m'
    
    # Background color
    BG_BLACK = '\033[40m'
    
    # Reset code
    RESET = '\033[0m'

    name: str = "Base Agent"
    color: str = '\033[37m'

    def log(self, message: str):
        """
        Mencatat pesan log INFO dengan identitas nama agen dan warna khusus.
        """
        color_code = self.BG_BLACK + self.color
        formatted_message = f"[{self.name}] {message}"
        logging.info(color_code + formatted_message + self.RESET)
```

### Aturan Warna per Agent di BizInsight:
- `SQLAgent` → **CYAN** (query database)
- `AnalystAgent` → **BLUE** (analisis data)
- `ChartAgent` → **MAGENTA** (visualisasi)
- `ConversationalAgent` → **GREEN** (interaksi user)
- `BIAgentFramework` → **YELLOW** (orchestrator)

---

## 2. Multi-Model Failover Pattern

Semua agent yang memanggil LLM **WAJIB** menggunakan pola failover chain, agar jika model utama rate-limited atau down, otomatis switch ke cadangan.

```python
# Pattern: Multi-Model Failover (dari FrontierAgent & ConversationalAgent AutoBargain)

import os
from litellm import completion

class SQLAgent(Agent):
    name = "SQL Agent"
    color = Agent.CYAN

    FALLBACK_MODELS = [
        "gemini/gemini-3.6-flash",
        "groq/openai/gpt-oss-120b",
        "groq/openai/gpt-oss-20b",
        "gemini/gemini-3.1-flash-lite",
    ]

    def __init__(self, db_schema: str):
        self.db_schema = db_schema
        self.primary_model = os.getenv("PRIMARY_MODEL", "gemini/gemini-3.6-flash")
        
        # Build failover chain
        self.models_to_try = [self.primary_model]
        for m in self.FALLBACK_MODELS:
            if m not in self.models_to_try:
                self.models_to_try.append(m)

        self.log(f"SQL Agent initialized with {len(self.models_to_try)} failover models")

    def call_llm(self, messages: list) -> str:
        """Memanggil LLM dengan auto-failover ke model cadangan."""
        for model in self.models_to_try:
            try:
                self.log(f"Calling {model}...")
                response = completion(model=model, messages=messages)
                return response.choices[0].message.content
            except Exception as e:
                self.log(f"Model {model} failed ({e.__class__.__name__}). Switching to next fallback...")
        
        return "Error: All models exhausted."
```

---

## 3. ReAct Tool Calling Loop Pattern

Pattern ini adalah inti dari `ConversationalAgent`. LLM secara otonom memilih tools dan mengeksekusinya dalam loop.

```python
# Pattern: ReAct Tool Calling Loop (dari ConversationalAgent AutoBargain)

import json
from typing import List, Dict
from litellm import completion

class ConversationalAgent(Agent):
    name = "Conversational Agent"
    color = Agent.GREEN

    def __init__(self, sql_agent, analyst_agent, chart_agent):
        self.sql_agent = sql_agent
        self.analyst_agent = analyst_agent
        self.chart_agent = chart_agent
        self.chat_histories: Dict[str, List[Dict]] = {}

    # === TOOLS (Method yang bisa dipanggil oleh LLM) ===

    def query_database(self, question: str) -> str:
        """Tool: Menerjemahkan pertanyaan ke SQL, eksekusi, kembalikan hasilnya."""
        result = self.sql_agent.text_to_sql_and_execute(question)
        return json.dumps(result)

    def generate_chart(self, data: str, chart_hint: str) -> str:
        """Tool: Membuat visualisasi Plotly dari data."""
        chart = self.chart_agent.create_chart(data, chart_hint)
        return json.dumps(chart)

    def analyze_data(self, data: str, context: str) -> str:
        """Tool: Menganalisis data dan menghasilkan insight bisnis."""
        insight = self.analyst_agent.analyze(data, context)
        return json.dumps(insight)

    # === TOOL DEFINITIONS (Schema untuk LLM) ===

    def get_tool_definitions(self) -> List[Dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "query_database",
                    "description": "Menerjemahkan pertanyaan bisnis ke SQL, eksekusi ke database, dan kembalikan hasilnya.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "question": {
                                "type": "string",
                                "description": "Pertanyaan bisnis yang ingin dijawab dari database"
                            }
                        },
                        "required": ["question"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_chart",
                    "description": "Membuat visualisasi chart (bar/line/pie/scatter) dari data query.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "data": {"type": "string", "description": "Data JSON dari hasil query database"},
                            "chart_hint": {"type": "string", "description": "Tipe chart yang disarankan: bar, line, pie, scatter, heatmap"}
                        },
                        "required": ["data"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "analyze_data",
                    "description": "Menganalisis data dan menghasilkan insight bisnis berupa rangkuman dan rekomendasi.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "data": {"type": "string", "description": "Data JSON untuk dianalisis"},
                            "context": {"type": "string", "description": "Konteks pertanyaan user untuk analisis yang lebih tepat"}
                        },
                        "required": ["data"]
                    }
                }
            }
        ]

    # === REACT LOOP (Inti percakapan) ===

    def chat(self, user_message: str, session_id: str = "default") -> str:
        """
        Menjalankan loop percakapan ReAct: LLM menalar, memanggil tools jika perlu, dan membalas.
        MAKSIMAL 4 iterasi tool calling per pertanyaan.
        """
        if session_id not in self.chat_histories:
            self.chat_histories[session_id] = [
                {
                    "role": "system",
                    "content": (
                        "Anda adalah 'BizInsight AI', konsultan Business Intelligence profesional.\n"
                        "Anda membantu menganalisis data bisnis e-commerce Indonesia.\n"
                        "Selalu gunakan tools yang tersedia untuk menjawab pertanyaan berbasis data.\n"
                        "Jawab dalam Bahasa Indonesia yang profesional dan ringkas."
                    )
                }
            ]

        history = self.chat_histories[session_id]
        history.append({"role": "user", "content": user_message})

        tools = self.get_tool_definitions()
        # Batasi histori agar tidak melebihi konteks window
        active_messages = [history[0]] + history[-6:]

        for model in self.models_to_try:
            try:
                # ReAct Iteration Loop (Maksimal 4 step tool calling)
                for _ in range(4):
                    response = completion(
                        model=model,
                        messages=active_messages,
                        tools=tools,
                        tool_choice="auto",
                    )
                    choice = response.choices[0]
                    msg = choice.message

                    # Jika tidak ada tool calls → LLM siap membalas ke pengguna
                    if not getattr(msg, "tool_calls", None):
                        reply = msg.content or "Maaf, saya belum memahami."
                        history.append({"role": "assistant", "content": reply})
                        return reply

                    # Jika ada tool calls → eksekusi tool
                    active_messages.append(msg)
                    for tc in msg.tool_calls:
                        fn_name = tc.function.name
                        fn_args = json.loads(tc.function.arguments) if tc.function.arguments else {}

                        self.log(f"Executing tool '{fn_name}' with args: {fn_args}")

                        # Dispatch ke method yang sesuai
                        if fn_name == "query_database":
                            result = self.query_database(**fn_args)
                        elif fn_name == "generate_chart":
                            result = self.generate_chart(**fn_args)
                        elif fn_name == "analyze_data":
                            result = self.analyze_data(**fn_args)
                        else:
                            result = json.dumps({"error": f"Tool {fn_name} not found"})

                        active_messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": result
                        })

                # Final response setelah loop selesai
                final = completion(model=model, messages=active_messages)
                reply = final.choices[0].message.content or "Selesai."
                history.append({"role": "assistant", "content": reply})
                return reply

            except Exception as e:
                self.log(f"Model {model} error: {e}. Trying fallback...")
                continue

        return "Maaf, AI sedang sibuk. Coba lagi nanti."
```

---

## 4. Pydantic Structured Output Pattern

Semua data contract menggunakan Pydantic BaseModel dengan Field descriptions.

```python
# Pattern: Pydantic Data Models (dari cars.py AutoBargain)

from pydantic import BaseModel, Field
from typing import List, Optional, Any

class SQLQuery(BaseModel):
    """SQL query yang di-generate oleh LLM dari pertanyaan natural language."""
    query: str = Field(description="SQL query string yang valid")
    explanation: str = Field(description="Penjelasan apa yang dilakukan query ini")
    is_safe: bool = Field(description="True jika hanya SELECT, False jika mengandung mutasi")

class QueryResult(BaseModel):
    """Hasil eksekusi SQL query ke database."""
    columns: List[str] = Field(description="Nama kolom hasil query")
    rows: List[List[Any]] = Field(description="Baris-baris data hasil query")
    row_count: int = Field(description="Jumlah baris yang dikembalikan")
    execution_time_ms: float = Field(description="Waktu eksekusi dalam milidetik")

class ChartConfig(BaseModel):
    """Konfigurasi chart yang dipilih LLM berdasarkan data."""
    chart_type: str = Field(description="Tipe: bar / line / pie / scatter / heatmap / none")
    title: str = Field(description="Judul chart deskriptif")
    x_label: str = Field(default="", description="Label sumbu X")
    y_label: str = Field(default="", description="Label sumbu Y")
    x_column: str = Field(description="Nama kolom untuk sumbu X")
    y_columns: List[str] = Field(description="Nama kolom untuk sumbu Y")

class BIInsight(BaseModel):
    """Satu siklus lengkap tanya-jawab BI."""
    question: str = Field(description="Pertanyaan asli pengguna")
    sql_query: str = Field(description="SQL yang dieksekusi")
    summary: str = Field(description="Rangkuman analisis LLM")
    chart: Optional[ChartConfig] = Field(default=None, description="Konfigurasi chart")
    raw_data: QueryResult = Field(description="Data mentah hasil query")
```

---

## 5. Framework Orchestrator Pattern

Pattern ini menyatukan semua agent dan menyediakan entry point tunggal.

```python
# Pattern: Framework Orchestrator (dari CarAgentFramework AutoBargain)

import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv(override=True)

def init_logging():
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    if not root.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            "[%(asctime)s] [BizInsight] [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        root.addHandler(handler)


class BIAgentFramework:
    def __init__(self):
        init_logging()
        # Lazy init agents
        self.sql_agent = None
        self.analyst_agent = None
        self.chart_agent = None
        self.conversational_agent = None

    def init_agents_as_needed(self):
        """Lazy initialization - agents hanya dibuat saat pertama kali dibutuhkan."""
        if not self.sql_agent:
            from agents.sql_agent import SQLAgent
            from agents.analyst_agent import AnalystAgent
            from agents.chart_agent import ChartAgent
            from agents.conversational_agent import ConversationalAgent
            
            db_schema = self.get_db_schema()
            self.sql_agent = SQLAgent(db_schema)
            self.analyst_agent = AnalystAgent()
            self.chart_agent = ChartAgent()
            self.conversational_agent = ConversationalAgent(
                sql_agent=self.sql_agent,
                analyst_agent=self.analyst_agent,
                chart_agent=self.chart_agent,
            )

    def ask(self, question: str, session_id: str = "default") -> dict:
        """Entry point utama: terima pertanyaan, kembalikan insight."""
        self.init_agents_as_needed()
        return self.conversational_agent.chat(question, session_id)
    
    def get_db_schema(self) -> str:
        """Baca schema database untuk konteks LLM."""
        from db import get_schema_ddl
        return get_schema_ddl()
```

---

## 6. Gradio Dashboard Pattern

Pattern UI menggunakan Gradio dengan streaming logs, tabs, dan interactive components.

```python
# Pattern: Gradio Dashboard (dari app.py AutoBargain)
# Poin-poin kunci yang WAJIB diikuti:

import logging
import queue
import threading
import gradio as gr
import plotly.graph_objects as go

# 1. QueueHandler untuk streaming log ke UI
class QueueHandler(logging.Handler):
    def __init__(self, log_queue):
        super().__init__()
        self.log_queue = log_queue

    def emit(self, record):
        self.log_queue.put(self.format(record))


# 2. HTML formatter untuk log berwarna
def html_for(log_data):
    output = "<br>".join(log_data[-25:])
    return f"""
    <div style="height: 360px; overflow-y: auto; background-color: #0e0e13;
                color: #e2e8f0; font-family: 'SF Mono', monospace; font-size: 11.5px;
                padding: 14px; border-radius: 8px; line-height: 1.6;">
    {output}
    </div>
    """


# 3. Worker thread pattern untuk non-blocking LLM calls
def run_with_logging(question, log_data):
    log_queue = queue.Queue()
    result_queue = queue.Queue()
    setup_logging(log_queue)

    def worker():
        result = framework.ask(question)
        result_queue.put(result)

    thread = threading.Thread(target=worker)
    thread.start()
    # ... yield log updates sambil menunggu result


# 4. Gradio Blocks layout
with gr.Blocks(
    title="BizInsight AI — Business Intelligence Dashboard",
    theme=gr.themes.Soft(primary_hue="blue", secondary_hue="indigo"),
    fill_width=True,
) as ui:
    with gr.Tabs():
        with gr.TabItem("💬 AI Business Analyst"):
            # Chat + Chart + Table + SQL Preview
            pass
        with gr.TabItem("🖥️ Agent Logs"):
            # Streaming colored terminal logs
            pass
        with gr.TabItem("📋 Database Explorer"):
            # Schema viewer + sample data
            pass
```

---

## 7. Database Connection Pattern (BARU — Tidak ada di AutoBargain)

```python
# db.py — Database connection helper

import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv(override=True)

def get_connection():
    """Membuat koneksi ke PostgreSQL."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "bizinsight"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
    )

def execute_query(sql: str, max_rows: int = 500, timeout_sec: int = 10) -> dict:
    """Eksekusi SELECT query dengan safety guards."""
    # Safety check
    forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE"]
    sql_upper = sql.upper().strip()
    for kw in forbidden:
        if kw in sql_upper and not sql_upper.startswith("SELECT"):
            return {"error": f"Forbidden keyword: {kw}. Only SELECT queries are allowed."}

    conn = get_connection()
    try:
        conn.set_session(readonly=True)  # Extra safety: read-only mode
        cur = conn.cursor()
        cur.execute(f"SET statement_timeout = '{timeout_sec}s';")
        
        start = time.time()
        cur.execute(sql)
        elapsed = (time.time() - start) * 1000
        
        columns = [desc[0] for desc in cur.description] if cur.description else []
        rows = cur.fetchmany(max_rows)
        
        return {
            "columns": columns,
            "rows": [list(row) for row in rows],
            "row_count": len(rows),
            "execution_time_ms": round(elapsed, 2),
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

def get_schema_ddl() -> str:
    """Membaca schema DDL dari database untuk konteks LLM."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT table_name, column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
        """)
        rows = cur.fetchall()
        
        schema_parts = []
        current_table = None
        for table, col, dtype, nullable in rows:
            if table != current_table:
                if current_table:
                    schema_parts.append(");")
                schema_parts.append(f"\nCREATE TABLE {table} (")
                current_table = table
            null_str = "NOT NULL" if nullable == "NO" else ""
            schema_parts.append(f"    {col} {dtype} {null_str},")
        if current_table:
            schema_parts.append(");")
        
        return "\n".join(schema_parts)
    finally:
        conn.close()
```

---

## 8. Environment Variables Pattern

```bash
# .env — Konfigurasi environment

# === LLM API Keys (reuse dari AutoBargain) ===
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here

# === Database Connection ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bizinsight
DB_USER=postgres
DB_PASSWORD=postgres

# === Model Configuration ===
PRIMARY_MODEL=gemini/gemini-3.6-flash
FALLBACK_MODEL=groq/openai/gpt-oss-120b
```

---

## CATATAN PENTING UNTUK AI ASSISTANT

Saat membangun BizInsight AI, SELALU ikuti pola-pola di atas:
1. **Setiap agent** extends `BaseAgent` dengan warna ANSI unik.
2. **Setiap LLM call** menggunakan `litellm.completion()` dengan multi-model failover.
3. **Conversational flow** menggunakan ReAct tool calling loop (maks 4 iterasi).
4. **Data contracts** menggunakan Pydantic BaseModel dengan Field descriptions.
5. **Framework** menggunakan lazy initialization dan single entry point.
6. **Dashboard** menggunakan Gradio Blocks dengan streaming log via QueueHandler.
7. **Database** menggunakan psycopg2 dengan read-only mode dan query timeout.
