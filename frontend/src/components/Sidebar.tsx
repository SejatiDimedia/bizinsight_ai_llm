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
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/60 p-3">
      {/* New Chat Button */}
      <button
        onClick={onNewSession}
        className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-3.5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        <span>Percakapan Baru</span>
      </button>

      {/* Session List Title */}
      <div className="mt-4 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Riwayat Analisis
        </span>
        <span className="text-[10px] text-slate-500">
          {sessions.length} sesi
        </span>
      </div>

      {/* Sessions Scrollable Area */}
      <div className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
        {sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Belum ada riwayat sesi.
          </div>
        ) : (
          sessions.map((sess) => {
            const isActive = sess.session_id === activeSessionId;
            return (
              <div
                key={sess.session_id}
                onClick={() => onSelectSession(sess.session_id)}
                className={`group flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                  isActive
                    ? 'border border-indigo-500/40 bg-indigo-600/15 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex min-w-0 items-center space-x-2">
                  <MessageSquare
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />
                  <span className="truncate">{sess.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(sess.session_id);
                  }}
                  title="Hapus Sesi"
                  className="ml-1 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
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
