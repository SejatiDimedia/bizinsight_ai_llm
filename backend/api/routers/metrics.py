import asyncio
import logging
from fastapi import APIRouter, HTTPException

from backend.api.schemas import StatsResponse, StatsSummary
from backend.core.framework import BIAgentFramework

router = APIRouter(tags=["Metrics & Analytics"])
logger = logging.getLogger("BizInsight.MetricsRouter")

# Framework instance
framework = BIAgentFramework()


@router.get("/stats", response_model=StatsResponse)
async def get_business_stats():
    """Mengembalikan ringkasan metrik performa toko (omset, pelanggan, produk, pesanan selesai)."""
    try:
        loop = asyncio.get_running_loop()
        stats_dict = await loop.run_in_executor(None, framework.get_stats_summary)
        return StatsResponse(
            success=True,
            stats=StatsSummary(**stats_dict)
        )
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
