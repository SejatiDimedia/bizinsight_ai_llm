import json
import os
import re
from typing import Any, Dict, List
from dotenv import load_dotenv
from litellm import completion

from agents.agent import Agent
from agents.models import QueryResult, SQLQuery
import db

load_dotenv(override=True)


class SQLAgent(Agent):
    """
    Agen spesialis Text-to-SQL untuk PostgreSQL.
    Menerjemahkan pertanyaan natural language menjadi SQL query,
    memvalidasi keamanan, mengeksekusi, dan melakukan self-healing jika query error.
    """

    name = "SQL Agent"
    color = Agent.CYAN  # Warna Cyan terminal untuk operasi database

    FALLBACK_MODELS = [
        "gemini/gemini-3.6-flash",
        "groq/openai/gpt-oss-120b",
        "gemini/gemini-3.1-flash-lite",
        "groq/openai/gpt-oss-20b",
    ]

    def __init__(self, db_schema: str = ""):
        self.db_schema = db_schema or db.get_schema_ddl()
        self.primary_model = os.getenv("PRIMARY_MODEL", "gemini/gemini-2.5-flash")

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
                    temperature=0.1,
                )
                content = response.choices[0].message.content or ""
                self.log(f"Berhasil mendapat respon dari model: {model}")
                return content.strip()
            except Exception as e:
                self.log(f"⚠️ Model {model} gagal ({e.__class__.__name__}: {str(e)[:100]}...). Beralih ke fallback berikutnya...")
                last_error = e

        raise RuntimeError(f"Semua model LLM gagal dihubungi. Error terakhir: {last_error}")

    def generate_sql(self, question: str, error_feedback: str = "") -> SQLQuery:
        """
        Menerjemahkan pertanyaan bisnis natural language menjadi objek SQLQuery.
        Mendukung self-healing jika error_feedback diberikan.
        """
        system_prompt = f"""Anda adalah Senior PostgreSQL Database Engineer & Data Analyst untuk e-commerce Indonesia.
Tugas Anda adalah menulis SQL query (PostgreSQL syntax) yang presisi untuk menjawab pertanyaan bisnis pengguna.

SKEMA DATABASE POSTGRESQL:
{self.db_schema}

ATURAN WAJIB (STRICT RULES):
1. HANYA buat query SELECT atau WITH (CTE). JANGAN PERNAH gunakan INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE.
2. Gunakan relasi tabel dengan tepat:
   - categories.id = products.category_id
   - regions.id = customers.region_id
   - customers.id = orders.customer_id
   - orders.id = order_items.order_id
   - products.id = order_items.product_id
3. Penjualan/Revenue dihitung dari `orders.total_amount` atau SUM(`order_items.subtotal`).
4. Filter status pesanan: Jika menghitung omset/penjualan nyata, utamakan status = 'completed'.
5. Tanggal: Database berisi data transaksi tahun 2026.
6. Berikan LIMIT maksimal 100 baris jika query berpotensi mengembalikan banyak data.
7. Format output HARUS berupa JSON murni tanpa markdown triple backticks (```json), dengan schema:
{{
  "query": "SELECT ... FROM ...",
  "explanation": "Penjelasan singkat dalam bahasa Indonesia mengenai tujuan query ini",
  "is_safe": true
}}
"""

        user_content = f"Pertanyaan: {question}"
        if error_feedback:
            user_content += f"\n\nPERINGATAN: Query sebelumnya menghasilkan error:\n{error_feedback}\nTolong perbaiki query SQL tersebut agar sesuai skema database!"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        raw_response = self._call_llm(messages)

        # Bersihkan jika LLM masih membungkus dalam markdown ```json ... ```
        cleaned_json = raw_response
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_response, re.DOTALL)
        if match:
            cleaned_json = match.group(1)
        else:
            cleaned_json = cleaned_json.strip("`").strip()

        try:
            data = json.loads(cleaned_json)
            sql_query = SQLQuery(
                query=data.get("query", "").strip(),
                explanation=data.get("explanation", ""),
                is_safe=data.get("is_safe", True),
            )
            self.log(f"SQL Dihasilkan: {sql_query.query}")
            return sql_query
        except Exception as e:
            self.log(f"Gagal parsing JSON output dari LLM: {raw_response}. Fallback regex...")
            # Fallback jika model gagal format JSON tapi menghasilkan query SELECT
            sql_match = re.search(r"(SELECT\s+.*?;?)", raw_response, re.IGNORECASE | re.DOTALL)
            if sql_match:
                extracted_sql = sql_match.group(1).strip()
                return SQLQuery(
                    query=extracted_sql,
                    explanation=f"Query diekstrak otomatis: {question}",
                    is_safe=True,
                )
            raise ValueError(f"LLM tidak mengembalikan SQL yang valid: {raw_response}")

    def execute(self, sql_query: SQLQuery) -> QueryResult:
        """Mengeksekusi SQLQuery ke database dan mengembalikan QueryResult."""
        if not sql_query.is_safe:
            raise ValueError("Query ditandai tidak aman (mengandung perintah mutasi)!")

        self.log(f"Mengeksekusi query: {sql_query.query}")
        result_dict = db.execute_query(sql_query.query)

        if "error" in result_dict:
            raise RuntimeError(result_dict["error"])

        return QueryResult(
            columns=result_dict["columns"],
            rows=result_dict["rows"],
            row_count=result_dict["row_count"],
            execution_time_ms=result_dict["execution_time_ms"],
        )

    def text_to_sql_and_execute(self, question: str) -> Dict[str, Any]:
        """
        Alur lengkap Text-to-SQL dengan Self-Healing:
        1. Generate SQL dari pertanyaan.
        2. Eksekusi ke PostgreSQL.
        3. Jika error pada percobaan pertama, kirim error ke LLM untuk diperbaiki (self-healing).
        """
        self.log(f"Menerima pertanyaan: '{question}'")
        try:
            sql_obj = self.generate_sql(question)
            try:
                result = self.execute(sql_obj)
                return {
                    "success": True,
                    "sql_query": sql_obj.query,
                    "explanation": sql_obj.explanation,
                    "result": result.model_dump(),
                }
            except Exception as exec_err:
                self.log(f"⚠️ Eksekusi query pertama gagal: {exec_err}. Memulai self-healing...")
                # Self-healing: minta LLM perbaiki query dengan menyertakan pesan error
                fixed_sql_obj = self.generate_sql(question, error_feedback=str(exec_err))
                result = self.execute(fixed_sql_obj)
                return {
                    "success": True,
                    "sql_query": fixed_sql_obj.query,
                    "explanation": fixed_sql_obj.explanation,
                    "result": result.model_dump(),
                    "healed": True,
                }
        except Exception as err:
            self.log(f"❌ Text-to-SQL gagal total: {err}")
            return {
                "success": False,
                "error": str(err),
                "question": question,
            }


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    
    print("🧪 Menguji SQLAgent secara mandiri...")
    agent = SQLAgent()
    
    test_question = "Tampilkan 5 produk dengan penjualan terbanyak beserta total unit yang terjual"
    print(f"\n❓ Pertanyaan: '{test_question}'\n")
    
    output = agent.text_to_sql_and_execute(test_question)
    print("\n📊 Hasil:")
    print(json.dumps(output, indent=2, ensure_ascii=False))