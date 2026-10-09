import React from 'react';
import {
  Database,
  Palette,
  RefreshCw,
  Settings,
  Terminal,
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
  health,
  onRefreshStats,
  onToggleDbExplorer,
  onToggleLogDrawer,
  isLogDrawerOpen,
  isLoadingStats,
}) => {
  const isHealthy = health?.status === 'healthy';

  return (
    <header className="flex items-center justify-between px-6 py-3.5">
      {/* Left filler or breadcrumb (keeps center balanced) */}
      <div className="flex items-center space-x-2">
        <span className="flex items-center space-x-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isHealthy ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="hidden sm:inline">
            {isHealthy ? 'PostgreSQL 16 Connected' : 'DB Offline'}
          </span>
        </span>
      </div>

      {/* Right Action Controls: Synapse floating pills style */}
      <div className="flex items-center space-x-2">
        {/* Appearance Pill */}
        <button
          type="button"
          onClick={() => alert('Tema aktif: Frosted Obsidian & Platinum')}
          className="flex items-center space-x-1.5 rounded-xl border border-white/[0.09] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur-xl transition hover:border-white/[0.18] hover:bg-white/[0.10] hover:text-white focus-visible:outline-none"
        >
          <Palette className="h-3.5 w-3.5 text-slate-400" />
          <span>Appearance</span>
        </button>

        {/* DB Explorer Pill */}
        <button
          type="button"
          onClick={onToggleDbExplorer}
          className="flex items-center space-x-1.5 rounded-xl border border-white/[0.09] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur-xl transition hover:border-white/[0.18] hover:bg-white/[0.10] hover:text-white focus-visible:outline-none"
        >
          <Database className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden sm:inline">Explorer</span>
        </button>

        {/* Terminal Logs Toggle */}
        <button
          type="button"
          onClick={onToggleLogDrawer}
          className={`flex items-center space-x-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium backdrop-blur-xl transition focus-visible:outline-none ${
            isLogDrawerOpen
              ? 'border-white/[0.25] bg-white/[0.15] text-white shadow-sm'
              : 'border-white/[0.09] bg-white/[0.05] text-slate-200 hover:border-white/[0.18] hover:bg-white/[0.10] hover:text-white'
          }`}
        >
          <Terminal className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden sm:inline">Logs</span>
        </button>

        {/* Refresh Stats */}
        <button
          type="button"
          onClick={onRefreshStats}
          title="Muat Ulang Metrik"
          disabled={isLoadingStats}
          className="rounded-xl border border-white/[0.08] bg-white/[0.05] p-2 text-slate-400 hover:bg-white/[0.1] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
        </button>

        {/* Settings Icon */}
        <button
          type="button"
          title="Pengaturan"
          onClick={() => alert('BizInsight AI v2.0 - Multi-Agent Engine')}
          className="rounded-xl border border-white/[0.08] bg-white/[0.05] p-2 text-slate-400 hover:bg-white/[0.1] hover:text-white"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
};
