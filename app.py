import logging
import queue
import re
import threading
import time
from typing import Any, Dict, List
import gradio as gr
import pandas as pd
import plotly.graph_objects as go

from bi_agent_framework import BIAgentFramework

# Inisialisasi Framework Orchestrator
framework = BIAgentFramework()

# Global Log Queue untuk streaming ke UI Tab 2
log_queue = queue.Queue()


class QueueHandler(logging.Handler):
    """Logging Handler kustom untuk mengalirkan log ke Gradio UI secara realtime."""
    def __init__(self, target_queue):
        super().__init__()
        self.target_queue = target_queue

    def emit(self, record):
        try:
            msg = self.format(record)
            self.target_queue.put(msg)
        except Exception:
            self.handleError(record)


# Pasang QueueHandler ke root logger
queue_handler = QueueHandler(log_queue)
formatter = logging.Formatter("[%(asctime)s] %(message)s", datefmt="%H:%M:%S")
queue_handler.setFormatter(formatter)
logging.getLogger().addHandler(queue_handler)


def ansi_to_html(text: str) -> str:
    """Mengonversi kode warna ANSI terminal menjadi tag HTML berwarna modern."""
    color_map = {
        r"\033\[36m": '<span style="color: #22d3ee; font-weight: bold;">',  # Cyan (SQL)
        r"\033\[34m": '<span style="color: #60a5fa; font-weight: bold;">',  # Blue (Analyst)
        r"\033\[35m": '<span style="color: #f472b6; font-weight: bold;">',  # Magenta (Chart)
        r"\033\[32m": '<span style="color: #4ade80; font-weight: bold;">',  # Green (Conversational)
        r"\033\[33m": '<span style="color: #facc15; font-weight: bold;">',  # Yellow (Framework)
        r"\033\[31m": '<span style="color: #f87171; font-weight: bold;">',  # Red (Error)
        r"\033\[37m": '<span style="color: #f1f5f9;">',                     # White
        r"\033\[0m": "</span>",                                             # Reset
    }
    
    # Hapus background ANSI code (misal \033[40m)
    text = re.sub(r"\033\[4\dm", "", text)
    for pattern, tag in color_map.items():
        text = re.sub(pattern, tag, text)
    
    # Bersihkan sisa escape sequence lainnya
    text = re.sub(r"\033\[\d+m", "", text)
    return text


# State list untuk menampung log historis
live_logs: List[str] = []


def format_log_window(logs: List[str]) -> str:
    """Merender tampilan terminal bergaya dark mode untuk Tab 2."""
    raw_content = "<br>".join(logs[-45:]) if logs else "<i>Menunggu aktivitas agen...</i>"
    html_content = ansi_to_html(raw_content)
    return f"""
    <div style="height: 520px; overflow-y: auto; background-color: #0b0f19;
                color: #e2e8f0; font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
                font-size: 12px; padding: 16px; border-radius: 8px; line-height: 1.7;
                border: 1px solid #1e293b;">
        {html_content}
    </div>
    """


# =============================================================================
# 🔄 ALUR INTERAKSI CHATBOT & STREAMING (FORMAT GRADIO 6)
# =============================================================================

def user_submit(user_message, chat_history):
    """Menambahkan pesan user ke tampilan chat segera setelah tombol ditekan."""
    if not user_message.strip():
        return "", chat_history
    if chat_history is None:
        chat_history = []
    updated_history = chat_history + [{"role": "user", "content": user_message}]
    return "", updated_history


def run_agent_turn(chat_history):
    """
    Menjalankan ReAct Loop Multi-Agent di worker thread terpisah,
    sambil mengalirkan log secara live ke tab terminal.
    """
    if not chat_history:
        yield chat_history, None, pd.DataFrame(), "", format_log_window(live_logs)
        return

    # Ambil pesan user terakhir
    user_question = chat_history[-1]["content"]
    result_container = {}

    def worker():
        try:
            res = framework.ask(user_question, session_id="gradio_session")
            result_container["res"] = res
        except Exception as e:
            result_container["error"] = str(e)

    # Jalankan framework di background thread
    worker_thread = threading.Thread(target=worker)
    worker_thread.start()

    # Loop polling log queue selama agen bekerja
    while worker_thread.is_alive():
        while not log_queue.empty():
            msg = log_queue.get_nowait()
            live_logs.append(msg)
        
        temp_history = chat_history + [{
            "role": "assistant",
            "content": "⏳ *Sedang menganalisis database & meracik visualisasi...*"
        }]
        yield temp_history, None, pd.DataFrame(), "", format_log_window(live_logs)
        time.sleep(0.3)

    # Kosongkan sisa antrean log
    while not log_queue.empty():
        live_logs.append(log_queue.get_nowait())

    # Proses hasil dari container
    if "res" in result_container:
        res = result_container["res"]
        reply_text = res.get("reply", "Selesai.")
        sql_query = res.get("sql_query", "")
        figure = res.get("figure", None)
        raw_data = res.get("raw_data", None)

        # Siapkan DataFrame untuk tabel panel
        df = pd.DataFrame()
        if raw_data and isinstance(raw_data, dict):
            cols = raw_data.get("columns", [])
            rows = raw_data.get("rows", [])
            if cols and rows:
                df = pd.DataFrame(rows, columns=cols)

        final_history = chat_history + [{"role": "assistant", "content": reply_text}]
        yield final_history, figure, df, sql_query, format_log_window(live_logs)

    else:
        err = result_container.get("error", "Terjadi kesalahan sistem.")
        final_history = chat_history + [{"role": "assistant", "content": f"❌ **Error**: {err}"}]
        yield final_history, None, pd.DataFrame(), "", format_log_window(live_logs)


def load_database_stats():
    """Mengambil kartu statistik untuk Tab 3."""
    stats = framework.get_stats_summary()
    return (
        f"{stats['total_products']:,}",
        f"{stats['total_customers']:,}",
        f"{stats['completed_orders']:,}",
        f"Rp {stats['total_revenue']:,.2f}",
    )


def load_table_preview(table_name):
    """Mengambil sampel isi tabel database untuk Tab 3."""
    res = framework.get_sample_data(table_name, limit=15)
    if res.get("columns") and res.get("rows"):
        return pd.DataFrame(res["rows"], columns=res["columns"])
    return pd.DataFrame()


# =============================================================================
# 🎨 GRADIO BLOCKS UI LAYOUT
# =============================================================================

custom_css = """
.gradio-container { max-width: 98% !important; margin: auto; }
.metric-box { text-align: center; padding: 15px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
.metric-box h3 { font-size: 24px; font-weight: bold; margin: 0; color: #1e3a8a; }
.metric-box p { font-size: 13px; color: #64748b; margin: 5px 0 0 0; }
"""

with gr.Blocks(title="BizInsight AI — Business Intelligence Dashboard") as demo:
    gr.Markdown("""
    # **BizInsight AI**
    ### *Autonomous Business Intelligence Multi-Agent System (Text-to-SQL + Plotly + E-Commerce BI)*
    """)

    with gr.Tabs():
        # =====================================================================
        # 💬 TAB 1: AI BUSINESS ANALYST CHAT
        # =====================================================================
        with gr.TabItem("💬 AI Business Analyst"):
            with gr.Row():
                # Kolom Kiri: Chatbot & Input
                with gr.Column(scale=5):
                    chatbot = gr.Chatbot(
                        label="Percakapan Analisis Bisnis",
                        height=460,
                    )
                    with gr.Row():
                        msg_input = gr.Textbox(
                            placeholder="Tanyakan analisis bisnis dalam bahasa natural... (contoh: 'Berapa omset per kategori di 2026?')",
                            label="Pertanyaan Bisnis",
                            scale=8,
                            lines=2,
                        )
                        submit_btn = gr.Button("Kirim 🚀", variant="primary", scale=2)

                    gr.Markdown("**💡 Contoh Pertanyaan Cepat:**")
                    with gr.Row():
                        btn_sug1 = gr.Button("📈 Omset per Kategori", size="sm")
                        btn_sug2 = gr.Button("🏆 Top 5 Produk Terlaris", size="sm")
                        btn_sug3 = gr.Button("📊 Tren Penjualan Bulanan", size="sm")
                        btn_sug4 = gr.Button("🗺️ Penjualan per Wilayah", size="sm")

                # Kolom Kanan: Auto Chart & Data Table & SQL Preview
                with gr.Column(scale=5):
                    chart_display = gr.Plot(label="📊 Auto Visualization (Plotly)")
                    
                    with gr.Accordion("📋 Data Tabel Hasil Query", open=True):
                        table_display = gr.DataFrame(
                            label="Data Mentah PostgreSQL",
                            max_height=200,
                            wrap=True,
                        )
                    
                    with gr.Accordion("🔍 SQL Query Preview", open=False):
                        sql_display = gr.Code(
                            label="Generated SQL (PostgreSQL)",
                            language="sql",
                            lines=4,
                        )

        # =====================================================================
        # 🖥️ TAB 2: AGENT LOG STREAM
        # =====================================================================
        with gr.TabItem("🖥️ Real-time Agent Log Stream"):
            gr.Markdown("""
            Pantau orkestrasi internal multi-agen secara live:
            - <span style="color: #22d3ee; font-weight: bold;">Cyan</span>: **SQLAgent** (Text-to-SQL & PostgreSQL execution)
            - <span style="color: #60a5fa; font-weight: bold;">Blue</span>: **AnalystAgent** (Data summarization & insights)
            - <span style="color: #f472b6; font-weight: bold;">Magenta</span>: **ChartAgent** (Visualizations & Plotly)
            - <span style="color: #4ade80; font-weight: bold;">Green</span>: **ConversationalAgent** (ReAct Loop)
            - <span style="color: #facc15; font-weight: bold;">Yellow</span>: **Framework Orchestrator**
            """)
            log_terminal = gr.HTML(value=format_log_window([]), label="Terminal Logs")
            refresh_log_btn = gr.Button("🔄 Refresh Terminal Log", size="sm")

        # =====================================================================
        # 📋 TAB 3: DATABASE EXPLORER
        # =====================================================================
        with gr.TabItem("📋 Database Explorer"):
            gr.Markdown("### 📊 Ringkasan Metrik Database E-Commerce (2026)")
            with gr.Row():
                with gr.Column():
                    stat_prod = gr.Textbox(label="Total Produk", interactive=False)
                with gr.Column():
                    stat_cust = gr.Textbox(label="Total Pelanggan", interactive=False)
                with gr.Column():
                    stat_orders = gr.Textbox(label="Pesanan Sukses", interactive=False)
                with gr.Column():
                    stat_rev = gr.Textbox(label="Total Omset (Completed)", interactive=False)

            refresh_stats_btn = gr.Button("🔄 Perbarui Statistik Bisnis", size="sm", variant="secondary")

            gr.Markdown("---")
            gr.Markdown("### 🔎 Penjelajah Tabel Database")
            with gr.Row():
                table_selector = gr.Dropdown(
                    choices=["categories", "products", "customers", "regions", "orders", "order_items"],
                    value="products",
                    label="Pilih Tabel",
                    scale=4,
                )
                refresh_table_btn = gr.Button("Tampilkan Tabel", scale=1)

            explorer_table = gr.DataFrame(
                label="Pratinjau Data Tabel (15 Baris Pertama)",
                max_height=280,
            )

            with gr.Accordion("📜 Struktur Skema DDL Database", open=False):
                schema_code = gr.Code(value=framework.get_db_schema(), language="sql", lines=12)

    # =========================================================================
    # ⚡ EVENT HANDLERS & BINDINGS
    # =========================================================================

    submit_event = submit_btn.click(
        fn=user_submit,
        inputs=[msg_input, chatbot],
        outputs=[msg_input, chatbot],
    ).then(
        fn=run_agent_turn,
        inputs=[chatbot],
        outputs=[chatbot, chart_display, table_display, sql_display, log_terminal],
    )

    msg_input.submit(
        fn=user_submit,
        inputs=[msg_input, chatbot],
        outputs=[msg_input, chatbot],
    ).then(
        fn=run_agent_turn,
        inputs=[chatbot],
        outputs=[chatbot, chart_display, table_display, sql_display, log_terminal],
    )

    # Event Tombol Rekomendasi Cepat
    btn_sug1.click(fn=lambda: "Bagaimana perbandingan omset per kategori produk di tahun 2026?", outputs=msg_input)
    btn_sug2.click(fn=lambda: "Tampilkan 5 produk dengan total kuantitas penjualan tertinggi beserta omsetnya", outputs=msg_input)
    btn_sug3.click(fn=lambda: "Tunjukkan tren penjualan bulanan sepanjang tahun 2026", outputs=msg_input)
    btn_sug4.click(fn=lambda: "Wilayah mana yang memiliki total transaksi penjualan terbesar?", outputs=msg_input)

    # Event Log Terminal Refresh
    refresh_log_btn.click(
        fn=lambda: format_log_window(live_logs),
        outputs=log_terminal,
    )

    # Event Tab 3 Explorer
    refresh_stats_btn.click(
        fn=load_database_stats,
        outputs=[stat_prod, stat_cust, stat_orders, stat_rev],
    )

    table_selector.change(
        fn=load_table_preview,
        inputs=[table_selector],
        outputs=[explorer_table],
    )
    refresh_table_btn.click(
        fn=load_table_preview,
        inputs=[table_selector],
        outputs=[explorer_table],
    )

    # Muat data awal saat dashboard pertama kali dibuka
    demo.load(
        fn=load_database_stats,
        outputs=[stat_prod, stat_cust, stat_orders, stat_rev],
    )
    demo.load(
        fn=lambda: load_table_preview("products"),
        outputs=[explorer_table],
    )


if __name__ == "__main__":
    print("🚀 Menjalankan BizInsight AI Web Dashboard di http://127.0.0.1:7860 ...")
    demo.queue()
    demo.launch(server_name="127.0.0.1", server_port=7860, inbrowser=True, css=custom_css)