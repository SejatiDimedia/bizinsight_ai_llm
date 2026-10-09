import json
import logging
import os
import sys
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

from backend.database import connection as db

load_dotenv(override=True)


def init_logging():
    """Menginisialisasi logger utama dengan format terstandarisasi jika belum di-setup."""
    root = logging.getLogger()
    if not root.handlers:
        root.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            "[%(asctime)s] [BizInsight] [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        root.addHandler(handler)


def serialize_plotly_figure(fig: Any) -> Optional[Dict[str, Any]]:
    """Mengonversi objek Plotly Figure menjadi dictionary JSON murni (bebas numpy.ndarray) yang aman untuk frontend React."""
    if fig is None:
        return None
    try:
        if hasattr(fig, "to_json"):
            return json.loads(fig.to_json())
        import plotly.io as pio
        return json.loads(pio.to_json(fig))
    except Exception:
        pass
    return None


class BIAgentFramework:
    """
    Framework Orchestrator utama untuk BizInsight AI.
    Menyediakan antarmuka tunggal untuk aplikasi UI / API,
    mengelola siklus hidup agen, dan menyimpan riwayat percakapan per session.
    """

    def __init__(self):
        init_logging()
        self.logger = logging.getLogger("BizInsight")

        # Lazy Initialization (Agen hanya di-load saat dipanggil pertama kali)
        self.sql_agent = None
        self.analyst_agent = None
        self.chart_agent = None
        self.conversational_agent = None

        # Rich Session Messages Storage (Thread-safe)
        self.history_lock = threading.Lock()
        self.session_messages: Dict[str, List[Dict[str, Any]]] = {}

        self.logger.info("BIAgentFramework initialized (Agents in Lazy Mode).")

    def init_agents_as_needed(self):
        """Menginisialisasi semua agen secara lazy."""
        if not self.conversational_agent:
            self.logger.info("Memuat agen-agen spesialis ke memori...")
            from agents.sql_agent import SQLAgent
            from agents.analyst_agent import AnalystAgent
            from agents.chart_agent import ChartAgent
            from agents.conversational_agent import ConversationalAgent

            # Dapatkan skema DDL dari database untuk konteks SQLAgent
            schema_ddl = db.get_schema_ddl()

            self.sql_agent = SQLAgent(db_schema=schema_ddl)
            self.analyst_agent = AnalystAgent()
            self.chart_agent = ChartAgent()
            self.conversational_agent = ConversationalAgent(
                sql_agent=self.sql_agent,
                analyst_agent=self.analyst_agent,
                chart_agent=self.chart_agent,
            )
            self.logger.info("Seluruh agen berhasil diinisialisasi.")

    def ask(self, question: str, session_id: str = "default") -> Dict[str, Any]:
        """
        Entry point utama: menerima pertanyaan bisnis pengguna,
        menjalankan ReAct Loop, menyimpan riwayat turn lengkap (tanya + jawab + chart + SQL),
        dan mengembalikan hasil lengkap.
        """
        self.init_agents_as_needed()
        self.logger.info(f"Pertanyaan masuk [{session_id}]: '{question}'")

        now_str = datetime.now().isoformat()
        user_msg = {
            "id": f"msg-{int(time.time() * 1000)}-user",
            "role": "user",
            "content": question,
            "timestamp": now_str,
        }

        with self.history_lock:
            if session_id not in self.session_messages:
                self.session_messages[session_id] = []
            self.session_messages[session_id].append(user_msg)

        # Jalankan ReAct chat
        result = self.conversational_agent.chat(question, session_id=session_id)

        # Serialisasi chart ke dict yang aman
        chart_dict = serialize_plotly_figure(result.get("figure"))
        result["chart"] = chart_dict

        # Simpan assistant message
        assistant_msg = {
            "id": f"msg-{int(time.time() * 1000) + 1}-assistant",
            "role": "assistant",
            "reply": result.get("reply", ""),
            "sql_query": result.get("sql_query", ""),
            "raw_data": result.get("raw_data"),
            "chart": chart_dict,
            "chart_type": result.get("chart_type", "none"),
            "timestamp": datetime.now().isoformat(),
        }

        with self.history_lock:
            self.session_messages[session_id].append(assistant_msg)

        return result

    def get_session_history(self, session_id: str = "default") -> List[Dict[str, Any]]:
        """Mengambil riwayat percakapan lengkap untuk session_id tertentu."""
        with self.history_lock:
            return list(self.session_messages.get(session_id, []))

    def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Mengambil daftar seluruh sesi aktif beserta ringkasan judul dan jumlah pesan."""
        summaries = []
        with self.history_lock:
            for s_id, msgs in self.session_messages.items():
                first_user_msg = next((m.get("content", "") for m in msgs if m.get("role") == "user"), s_id)
                title = (first_user_msg[:35] + "...") if len(first_user_msg) > 35 else first_user_msg
                last_time = msgs[-1]["timestamp"] if msgs else datetime.now().isoformat()
                summaries.append({
                    "session_id": s_id,
                    "title": title or s_id,
                    "message_count": len(msgs),
                    "last_active": last_time,
                })
        summaries.sort(key=lambda x: x["last_active"], reverse=True)
        return summaries

    def reset_session(self, session_id: str = "default"):
        """Mereset histori percakapan dan artefak untuk session tertentu."""
        with self.history_lock:
            if session_id in self.session_messages:
                self.session_messages[session_id] = []

        if self.conversational_agent:
            if session_id in self.conversational_agent.chat_histories:
                del self.conversational_agent.chat_histories[session_id]
            if session_id in self.conversational_agent.session_artifacts:
                del self.conversational_agent.session_artifacts[session_id]
            self.logger.info(f"Sesi percakapan '{session_id}' berhasil direset.")

    def delete_session(self, session_id: str):
        """Menghapus sesi secara permanen."""
        with self.history_lock:
            if session_id in self.session_messages:
                del self.session_messages[session_id]

        if self.conversational_agent:
            if session_id in self.conversational_agent.chat_histories:
                del self.conversational_agent.chat_histories[session_id]
            if session_id in self.conversational_agent.session_artifacts:
                del self.conversational_agent.session_artifacts[session_id]

    # =========================================================================
    # 📊 DATABASE EXPLORER & STATS HELPERS
    # =========================================================================

    def get_stats_summary(self) -> Dict[str, Any]:
        """Menghitung ringkasan statistik cepat dari database."""
        stats_sql = """
        SELECT
            (SELECT COUNT(*) FROM products) as total_products,
            (SELECT COUNT(*) FROM customers) as total_customers,
            (SELECT COUNT(*) FROM orders WHERE status = 'completed') as completed_orders,
            (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed') as total_revenue;
        """
        res = db.execute_query(stats_sql)
        if res.get("rows"):
            row = res["rows"][0]
            return {
                "total_products": int(row[0]),
                "total_customers": int(row[1]),
                "completed_orders": int(row[2]),
                "total_revenue": float(row[3]),
            }
        return {
            "total_products": 0,
            "total_customers": 0,
            "completed_orders": 0,
            "total_revenue": 0.0,
        }

    def get_sample_data(self, table_name: str, limit: int = 10) -> Dict[str, Any]:
        """Mengambil data sampel dari tabel database yang dipilih."""
        allowed_tables = ["categories", "regions", "products", "customers", "orders", "order_items"]
        if table_name not in allowed_tables:
            return {"columns": [], "rows": [], "error": f"Tabel '{table_name}' tidak diizinkan atau tidak ditemukan."}

        query = f"SELECT * FROM {table_name} LIMIT {limit};"
        return db.execute_query(query)

    def get_db_schema(self) -> str:
        """Mengembalikan representasi teks skema DDL."""
        return db.get_schema_ddl()
