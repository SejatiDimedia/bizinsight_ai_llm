"""
Backward-compatibility proxy for BIAgentFramework.
Delegates to backend.core.framework.
"""
from backend.core.framework import BIAgentFramework, init_logging

__all__ = ["BIAgentFramework", "init_logging"]

if __name__ == "__main__":
    print("🧪 Menguji BIAgentFramework...")
    framework = BIAgentFramework()

    print("\n📈 Ringkasan Metrik Bisnis:")
    stats = framework.get_stats_summary()
    print(f"  • Total Produk   : {stats['total_products']:,}")
    print(f"  • Total Pelanggan: {stats['total_customers']:,}")
    print(f"  • Pesanan Selesai: {stats['completed_orders']:,}")
    print(f"  • Total Omset    : Rp {stats['total_revenue']:,.2f}")