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
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      {/* Top Navbar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-md shadow-indigo-500/20">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                BizInsight <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">AI</span>
              </h1>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-indigo-300">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Business Intelligence Multi-Agent System</p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Health Badge */}
          <div
            className={`flex items-center space-x-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
              isHealthy
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isHealthy ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline">
              {isHealthy ? 'DB Connected' : 'DB Degraded'}
            </span>
          </div>

          {/* Database Explorer Button */}
          <button
            onClick={onToggleDbExplorer}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700/60"
          >
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">DB Explorer</span>
          </button>

          {/* Terminal Logs Toggle */}
          <button
            onClick={onToggleLogDrawer}
            className={`flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              isLogDrawerOpen
                ? 'border-indigo-500/60 bg-indigo-600/20 text-indigo-300'
                : 'border-slate-700/80 bg-slate-800/60 text-slate-200 hover:border-slate-600 hover:bg-slate-700/60'
            }`}
          >
            <Terminal className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Agent Logs</span>
          </button>

          {/* Refresh Stats */}
          <button
            onClick={onRefreshStats}
            title="Muat Ulang Metrik"
            disabled={isLoadingStats}
            className="rounded-lg border border-slate-700/80 bg-slate-800/60 p-1.5 text-slate-300 hover:bg-slate-700/60 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="border-t border-slate-800/60 bg-slate-900/40 px-4 py-2.5 sm:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {/* Card 1: Omset */}
          <div className="flex items-center space-x-3 rounded-lg border border-slate-800/60 bg-slate-900/60 p-2.5 transition hover:border-slate-700">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-slate-400">Total Omset</p>
              <p className="truncate text-sm font-bold text-white">
                {stats ? formatIDR(stats.total_revenue) : '—'}
              </p>
            </div>
          </div>

          {/* Card 2: Pesanan Selesai */}
          <div className="flex items-center space-x-3 rounded-lg border border-slate-800/60 bg-slate-900/60 p-2.5 transition hover:border-slate-700">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-slate-400">Pesanan Selesai</p>
              <p className="truncate text-sm font-bold text-white">
                {stats ? stats.completed_orders.toLocaleString('id-ID') : '—'}
              </p>
            </div>
          </div>

          {/* Card 3: Pelanggan */}
          <div className="flex items-center space-x-3 rounded-lg border border-slate-800/60 bg-slate-900/60 p-2.5 transition hover:border-slate-700">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-slate-400">Total Pelanggan</p>
              <p className="truncate text-sm font-bold text-white">
                {stats ? stats.total_customers.toLocaleString('id-ID') : '—'}
              </p>
            </div>
          </div>

          {/* Card 4: Produk */}
          <div className="flex items-center space-x-3 rounded-lg border border-slate-800/60 bg-slate-900/60 p-2.5 transition hover:border-slate-700">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
              <Package className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-slate-400">Total Produk (SKU)</p>
              <p className="truncate text-sm font-bold text-white">
                {stats ? stats.total_products.toLocaleString('id-ID') : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
