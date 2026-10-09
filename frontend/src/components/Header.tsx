import React from 'react';
import {
  Activity,
  Database,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingBag,
  Terminal,
  Users,
} from 'lucide-react';
import type { HealthResponse, StatsSummary } from '../types/api';

interface HeaderProps {
  stats: StatsSummary | null;
  health: HealthResponse | null;
  onRefreshStats: () => void;
  onToggleDbExplorer: () => void;
  onToggleLogDrawer: () => void;
  isLogDrawerOpen: boolean;
  isLoadingStats: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  health,
  onRefreshStats,
  onToggleDbExplorer,
  onToggleLogDrawer,
  isLogDrawerOpen,
  isLoadingStats,
}) => {
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const isHealthy = health?.status === 'healthy';

  return (
    <header className="border-b border-slate-800 bg-slate-950">
      {/* Top Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-blue-400">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold tracking-tight text-white">
                BizInsight <span className="text-blue-400">AI</span>
              </h1>
              <span className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-400">
                PostgreSQL BI
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Multi-Agent Business Intelligence Workbench
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Health Badge */}
          <div
            className={`flex items-center space-x-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
              isHealthy
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isHealthy ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline">
              {isHealthy ? 'DB Connected' : 'DB Offline'}
            </span>
          </div>

          {/* Database Explorer Button */}
          <button
            type="button"
            onClick={onToggleDbExplorer}
            className="flex items-center space-x-1.5 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Database className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">DB Explorer</span>
          </button>

          {/* Terminal Logs Toggle */}
          <button
            type="button"
            onClick={onToggleLogDrawer}
            className={`flex items-center space-x-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isLogDrawerOpen
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Terminal className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Agent Logs</span>
          </button>

          {/* Refresh Stats */}
          <button
            type="button"
            onClick={onRefreshStats}
            title="Muat Ulang Metrik"
            disabled={isLoadingStats}
            className="rounded-md border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Financial Metric Strip */}
      <div className="border-t border-slate-800/80 bg-slate-900/50 px-4 py-2 sm:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {/* Card 1: Omset */}
          <div className="flex items-center space-x-2.5 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-800 bg-slate-950 text-slate-400">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">Total Omset</p>
              <p className="truncate text-xs font-semibold tabular-nums text-slate-100 sm:text-sm">
                {stats ? formatIDR(stats.total_revenue) : '-'}
              </p>
            </div>
          </div>

          {/* Card 2: Pesanan Selesai */}
          <div className="flex items-center space-x-2.5 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-800 bg-slate-950 text-slate-400">
              <ShoppingBag className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">Pesanan Selesai</p>
              <p className="truncate text-xs font-semibold tabular-nums text-slate-100 sm:text-sm">
                {stats ? `${stats.completed_orders.toLocaleString('id-ID')} order` : '-'}
              </p>
            </div>
          </div>

          {/* Card 3: Pelanggan */}
          <div className="flex items-center space-x-2.5 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-800 bg-slate-950 text-slate-400">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">Total Pelanggan</p>
              <p className="truncate text-xs font-semibold tabular-nums text-slate-100 sm:text-sm">
                {stats ? `${stats.total_customers.toLocaleString('id-ID')} user` : '-'}
              </p>
            </div>
          </div>

          {/* Card 4: Produk */}
          <div className="flex items-center space-x-2.5 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-800 bg-slate-950 text-slate-400">
              <Package className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">Katalog Produk</p>
              <p className="truncate text-xs font-semibold tabular-nums text-slate-100 sm:text-sm">
                {stats ? `${stats.total_products.toLocaleString('id-ID')} SKU` : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
