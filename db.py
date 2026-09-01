import os
import time
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List
import psycopg2
from dotenv import load_dotenv

# Muat variabel environment dari .env
load_dotenv(override=True)


def get_connection():
    """Membuat koneksi ke database PostgreSQL."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "bizinsight"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
    )


def _serialize_value(val: Any) -> Any:
    """
    Helper untuk mengonversi tipe data PostgreSQL (Decimal, datetime)
    menjadi tipe standar Python yang ramah JSON (float, string).
    """
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    return val


def execute_query(sql: str, max_rows: int = 500, timeout_sec: int = 10) -> Dict[str, Any]:
    """
    Mengeksekusi SQL query dengan perlindungan keamanan ketat:
    1. Hanya query SELECT yang diizinkan (mencegah SQL Injection mutasi).
    2. Sesi database diset readonly = True.
    3. Batas waktu eksekusi (statement_timeout) maksimal timeout_sec.
    4. Maksimal baris dibatasi oleh max_rows.
    """
    # 1. Validasi Keamanan Query
    forbidden_keywords = [
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
        "TRUNCATE", "CREATE", "GRANT", "REVOKE", "EXECUTE"
    ]
    cleaned_sql = sql.strip()
    sql_upper = cleaned_sql.upper()

    # Pastikan query diawali dengan SELECT atau WITH (untuk CTE)
    if not (sql_upper.startswith("SELECT") or sql_upper.startswith("WITH")):
        return {
            "error": "Query ditolak: Hanya query baca data (SELECT / WITH) yang diizinkan."
        }

    # Cek apakah ada keyword berbahaya di dalam query
    for kw in forbidden_keywords:
        # Pengecekan kata per token agar tidak salah mendeteksi nama kolom (misal: 'created_at')
        tokens = sql_upper.replace(";", " ").split()
        if kw in tokens:
            return {
                "error": f"Query ditolak: Kata kunci berbahaya '{kw}' tidak diizinkan."
            }

    # 2. Eksekusi ke Database
    conn = None
    try:
        conn = get_connection()
        conn.set_session(readonly=True)  # Mode Read-Only di level PostgreSQL session
        
        with conn.cursor() as cur:
            # Set timeout agar query berat/gagal tidak menggantung server
            cur.execute(f"SET statement_timeout = '{timeout_sec}s';")
            
            start_time = time.time()
            cur.execute(cleaned_sql)
            elapsed_ms = (time.time() - start_time) * 1000

            columns = [desc[0] for desc in cur.description] if cur.description else []
            raw_rows = cur.fetchmany(max_rows)

            # Konversi nilai ke tipe yang aman untuk JSON serialization
            serialized_rows = [
                [_serialize_value(val) for val in row]
                for row in raw_rows
            ]

            return {
                "columns": columns,
                "rows": serialized_rows,
                "row_count": len(serialized_rows),
                "execution_time_ms": round(elapsed_ms, 2),
            }

    except Exception as e:
        return {"error": f"Database Error: {str(e)}"}
    finally:
        if conn:
            conn.close()


def get_schema_ddl() -> str:
    """
    Membaca struktur tabel dan kolom aktif dari PostgreSQL (information_schema)
    dan memformatnya menjadi DDL string sebagai konteks untuk LLM Text-to-SQL.
    """
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name, column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position;
            """)
            rows = cur.fetchall()

            if not rows:
                return "Belum ada tabel yang dibuat di database."

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
    except Exception as e:
        return f"Gagal membaca skema: {str(e)}"
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    print("🔄 Menguji koneksi ke PostgreSQL...")
    test_result = execute_query("SELECT NOW() as current_time, 1 as test_val;")
    if "error" in test_result:
        print("❌ Gagal terhubung:", test_result["error"])
    else:
        print("✅ Koneksi PostgreSQL Berhasil!")
        print("📊 Hasil test query:", test_result)
        print("\n📋 DDL Skema saat ini:")
        print(get_schema_ddl())