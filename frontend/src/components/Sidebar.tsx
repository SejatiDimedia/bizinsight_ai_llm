import React, { useState } from 'react';
import {
  Compass,
  Folder,
  Home,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { SessionSummary } from '../types/api';

interface SidebarProps {
  sessions: SessionSummary[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onNavigateHome: () => void;
  onOpenDbExplorer: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onNavigateHome,
  onOpenDbExplorer,
}) => {
  const [showUpgradeCard, setShowUpgradeCard] = useState(true);
  const [folders, setFolders] = useState<string[]>(['Analisis Bulanan', 'Analytica ideas']);

  const handleAddFolder = () => {
    const name = window.prompt('Nama folder baru:');
    if (name && name.trim()) {
      setFolders((prev) => [...prev, name.trim()]);
    }
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#090d16]/65 backdrop-blur-3xl p-3 text-slate-300">
      {/* Top Header: Brand & Collapse */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <img
            src="/logo.png"
            alt="BizInsight AI"
            className="h-6 w-6 rounded-md object-cover border border-white/[0.12] shadow-xs"
          />
          <span className="text-sm font-semibold tracking-tight text-white lowercase">
            bizinsight
          </span>
        </div>
        <button
          type="button"
          title="Tutup Panel"
          className="rounded p-1 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <button
        type="button"
        onClick={onNewSession}
        className="flex w-full items-center justify-center space-x-2 rounded-xl border border-white/[0.08] bg-white/[0.06] py-2 px-3 text-xs font-medium text-white shadow-xs transition hover:bg-white/[0.1] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Plus className="h-4 w-4" />
        <span>New Chat</span>
      </button>

      {/* Primary Navigation */}
      <div className="mt-3 space-y-0.5">
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex w-full items-center space-x-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
        >
          <Home className="h-3.5 w-3.5 text-slate-400" />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={onOpenDbExplorer}
          className="flex w-full items-center space-x-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
        >
          <Compass className="h-3.5 w-3.5 text-slate-400" />
          <span>Explore BizInsight AI</span>
        </button>
      </div>

      {/* Folder Section */}
      <div className="mt-4">
        <div className="flex items-center justify-between px-2 text-[11px] font-medium text-slate-400">
          <span>Folder</span>
          <button
            type="button"
            onClick={handleAddFolder}
            title="Tambah Folder"
            className="rounded p-0.5 text-slate-400 hover:text-white"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <div className="mt-1 space-y-0.5">
          {folders.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.05] hover:text-white cursor-pointer"
            >
              <Folder className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History Section */}
      <div className="mt-4 flex-1 overflow-hidden flex flex-col">
        <div className="px-2 text-[11px] font-medium text-slate-400">
          <span>History</span>
        </div>
        <div className="mt-1 flex-1 space-y-0.5 overflow-y-auto pr-1">
          {sessions.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500">
              Belum ada riwayat sesi.
            </div>
          ) : (
            sessions.map((sess) => {
              const isActive = sess.session_id === activeSessionId;
              return (
                <div
                  key={sess.session_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectSession(sess.session_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSession(sess.session_id);
                    }
                  }}
                  className={`group flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                    isActive
                      ? 'border border-white/[0.08] bg-white/[0.08] font-medium text-white'
                      : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <div className="flex min-w-0 items-center space-x-2">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{sess.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(sess.session_id);
                    }}
                    title="Hapus Sesi"
                    className="ml-1 opacity-0 transition group-hover:opacity-100 hover:text-rose-400 text-slate-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Floating Upgrade / Info Card */}
      {showUpgradeCard && (
        <div className="relative mt-2 rounded-xl border border-white/[0.10] bg-[#10141f]/45 p-3 text-xs shadow-lg backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => setShowUpgradeCard(false)}
            className="absolute top-2 right-2 text-slate-400 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="flex items-center space-x-1.5 font-semibold text-white">
            <span className="text-white font-bold">∞</span>
            <span>BizInsight</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Enjoy more features like priority processing, custom AI models, and unlimited access.
          </p>
          <button
            type="button"
            onClick={onOpenDbExplorer}
            className="mt-2.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.08] py-1.5 text-center text-[11px] font-medium text-white transition hover:bg-white/[0.14]"
          >
            Explore Database
          </button>
        </div>
      )}

      {/* Workspace & Engine Status Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 px-1.5 text-slate-400">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-slate-300">BizInsight AI v2.0</p>
            <p className="truncate text-[10px] text-slate-500">Local Analytics Workspace</p>
          </div>
        </div>
        <span className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
          PG16
        </span>
      </div>
    </aside>
  );
};
