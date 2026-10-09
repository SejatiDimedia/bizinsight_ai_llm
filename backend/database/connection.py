import logging
import threading
import time
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2.pool import ThreadedConnectionPool

from backend.config import settings

logger = logging.getLogger("BizInsight.DB")

_pool: Optional[ThreadedConnectionPool] = None
_pool_lock = threading.Lock()


def get_raw_connection():
    """Membuat koneksi langsung tanpa pool (untuk fallback atau utilitas mandiri)."""
    return psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        dbname=settings.DB_NAME,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
    )


def init_connection_pool():
    """Menginisialisasi ThreadedConnectionPool PostgreSQL secara thread-safe."""
    global _pool
    with _pool_lock:
        if _pool is None or _pool.closed:
            try:
                _pool = ThreadedConnectionPool(
                    minconn=settings.DB_POOL_MIN,
                    maxconn=settings.DB_POOL_MAX,
                    host=settings.DB_HOST,
                    port=settings.DB_PORT,
                    dbname=settings.DB_NAME,
                    user=settings.DB_USER,
                    password=settings.DB_PASSWORD,
                )
                logger.info(f"Database ThreadedConnectionPool initialized (Min: {settings.DB_POOL_MIN}, Max: {settings.DB_POOL_MAX}).")
            except Exception as e:
                logger.warning(f"Gagal menginisialisasi Connection Pool ({e}). Fallback ke koneksi on-demand.")
                _pool = None


def close_pool():
    """Menutup seluruh koneksi di dalam pool saat aplikasi shutdown."""
    global _pool
    with _pool_lock:
        if _pool is not None and not _pool.closed:
            _pool.closeall()
            logger.info("Database Connection Pool closed.")
            _pool = None


@contextmanager
def get_db_connection():
    """
    Context manager thread-safe untuk meminjam dan mengembalikan koneksi dari pool.
    Otomatis fallback ke koneksi langsung jika pool belum tersedia.
    """
    global _pool
    conn = None
    from_pool = False

    try:
        if _pool is None or _pool.closed:
            init_connection_pool()

        if _pool is not None and not _pool.closed:
            conn = _pool.getconn()
            from_pool = True
        else:
            conn = get_raw_connection()
            from_pool = False

        yield conn

    finally:
        if conn is not None:
            if from_pool and _pool is not None and not _pool.closed:
                try:
                    _pool.putconn(conn)
                except Exception:
                    conn.close()
            else:
                try:
                    conn.close()
                except Exception:
                    pass


def _serialize_value(val: Any) -> Any:
    """Helper untuk konversi tipe data PostgreSQL (Decimal, datetime) ke tipe JSON standar."""
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    return val


def execute_query(sql: str, max_rows: int = 500, timeout_sec: int = 10) -> Dict[str, Any]:
    """
    Mengeksekusi SQL query dengan perlindungan keamanan ketat:
    1. Hanya query SELECT / WITH yang diizinkan (mencegah SQL Injection mutasi).
    2. Sesi database diset readonly = True.
    3. Batas waktu eksekusi (statement_timeout) maksimal timeout_sec.
    4. Maksimal baris dibatasi oleh max_rows.
    """
    forbidden_keywords = [
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
        "TRUNCATE", "CREATE", "GRANT", "REVOKE", "EXECUTE"
    ]
    cleaned_sql = sql.strip()
    sql_upper = cleaned_sql.upper()

    if not (sql_upper.startswith("SELECT") or sql_upper.startswith("WITH")):
        return {
            "error": "Query ditolak: Hanya query baca data (SELECT / WITH) yang diizinkan."
        }

    for kw in forbidden_keywords:
        tokens = sql_upper.replace(";", " ").replace("(", " ").replace(")", " ").split()
        if kw in tokens:
            return {
                "error": f"Query ditolak: Ditemukan perintah terlarang '{kw}'."
            }

    start_time = time.time()
    try:
        with get_db_connection() as conn:
            conn.readonly = True
            with conn.cursor() as cur:
                cur.execute(f"SET statement_timeout = '{timeout_sec}s';")
                cur.execute(cleaned_sql)

                if cur.description is None:
                    return {
                        "columns": [],
                        "rows": [],
                        "row_count": 0,
                        "execution_time_ms": round((time.time() - start_time) * 1000, 2),
                    }

                columns = [desc[0] for desc in cur.description]
                raw_rows = cur.fetchmany(max_rows)
                serialized_rows = [
                    [_serialize_value(val) for val in row]
                    for row in raw_rows
                ]

                exec_time = round((time.time() - start_time) * 1000, 2)
                return {
                    "columns": columns,
                    "rows": serialized_rows,
                    "row_count": len(serialized_rows),
                    "execution_time_ms": exec_time,
                }
    except Exception as e:
        return {"error": f"Database Error: {str(e)}"}


def get_schema_ddl() -> str:
    """
    Membaca struktur tabel dan kolom aktif dari PostgreSQL (information_schema)
    dan memformatnya menjadi DDL string sebagai konteks untuk LLM Text-to-SQL.
    """
    try:
        with get_db_connection() as conn:
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
