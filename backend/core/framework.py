import logging
import os
import sys
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


class BIAgentFramework:
    """
    Framework Orchestrator utama untuk BizInsight AI.
    Menyediakan antarmuka tunggal untuk aplikasi UI / API
    dan mengelola siklus hidup semua agen.
    """

    def __init__(self):
        init_logging()
        self.logger = logging.getLogger("BizInsight")

        # Lazy Initialization (Agen hanya di-load saat dipanggil pertama kali)
        self.sql_agent = None
        self.analyst_agent = None
        self.chart_agent = None
        self.conversational_agent = None

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
        menjalankan ReAct Loop, dan mengembalikan hasil lengkap.
        """
        self.init_agents_as_needed()
        self.logger.info(f"Pertanyaan masuk [{session_id}]: '{question}'")
        return self.conversational_agent.chat(question, session_id=session_id)

    def reset_session(self, session_id: str = "default"):
        """Mereset histori percakapan dan artefak untuk session tertentu."""
        if self.conversational_agent:
            if session_id in self.conversational_agent.chat_histories:
                del self.conversational_agent.chat_histories[session_id]
            if session_id in self.conversational_agent.session_artifacts:
                del self.conversational_agent.session_artifacts[session_id]
            self.logger.info(f"Sesi percakapan '{session_id}' berhasil direset.")

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
