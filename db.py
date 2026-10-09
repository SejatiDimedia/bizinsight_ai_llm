"""
Backward-compatibility proxy for database module.
Delegates to backend.database.connection.
"""
from backend.database.connection import (
    execute_query,
    get_schema_ddl,
    get_db_connection,
    get_raw_connection,
    close_pool,
    _serialize_value
)

# Alias for legacy code
get_connection = get_raw_connection

__all__ = [
    "execute_query",
    "get_schema_ddl",
    "get_db_connection",
    "get_connection",
    "close_pool",
    "_serialize_value",
]

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