import asyncio
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query

from backend.api.schemas import HealthResponse, SchemaResponse, TableDataResponse
from backend.core.framework import BIAgentFramework
from backend.database import connection as db

router = APIRouter(tags=["Database & Health"])
logger = logging.getLogger("BizInsight.DbRouter")

framework = BIAgentFramework()


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Pemeriksaan status konektivitas PostgreSQL dan backend server."""
    db_status = False
    db_error = None
    try:
        test_res = db.execute_query("SELECT 1 as ping;")
        if "rows" in test_res and not test_res.get("error"):
            db_status = True
        else:
            db_error = test_res.get("error")
    except Exception as e:
        db_error = str(e)

    return HealthResponse(
        status="healthy" if db_status else "degraded",
        database_connected=db_status,
        database_error=db_error,
        timestamp=datetime.now().isoformat()
    )


@router.get("/tables/{table_name}", response_model=TableDataResponse)
async def get_table_sample(table_name: str, limit: int = Query(default=10, ge=1, le=100)):
    """Mengambil sampel baris data dari tabel yang dipilih untuk Database Explorer."""
    try:
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(None, framework.get_sample_data, table_name, limit)
        if "error" in res:
            raise HTTPException(status_code=400, detail=res["error"])
        return TableDataResponse(
            success=True,
            table=table_name,
            limit=limit,
            data=res
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading table {table_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schema", response_model=SchemaResponse)
async def get_database_schema():
    """Mengembalikan DDL skema lengkap dari tabel-tabel di database."""
    try:
        loop = asyncio.get_running_loop()
        schema_text = await loop.run_in_executor(None, framework.get_db_schema)
        return SchemaResponse(
            success=True,
            schema_ddl=schema_text
        )
    except Exception as e:
        logger.error(f"Error reading schema: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
