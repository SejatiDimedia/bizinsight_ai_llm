import React from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import type { SessionSummary } from '../types/api';

interface SidebarProps {
  sessions: SessionSummary[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}) => {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 p-3">
      {/* New Session Button */}
      <button
        type="button"
        onClick={onNewSession}
        className="flex w-full items-center justify-center space-x-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-xs transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <Plus className="h-4 w-4" />
        <span>Sesi Baru</span>
      </button>

      {/* Session List Title */}
      <div className="mt-4 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Riwayat Analisis
        </span>
        <span className="text-[10px] tabular-nums text-slate-400">
          {sessions.length} sesi
        </span>
      </div>

      {/* Sessions Scrollable Area */}
      <div className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
        {sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
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
                className={`group flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'border border-slate-700 bg-slate-900 font-medium text-white'
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                }`}
              >
                <div className="flex min-w-0 items-center space-x-2">
                  <MessageSquare
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                    }`}
                  />
                  <span className="truncate">{sess.title}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(sess.session_id);
                  }}
                  title="Hapus Sesi"
                  className="ml-1 opacity-0 transition group-hover:opacity-100 hover:text-rose-400 focus-visible:opacity-100 focus-visible:outline-none text-slate-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
