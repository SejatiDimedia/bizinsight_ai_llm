import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Terminal, Trash2 } from 'lucide-react';

interface LogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
  onClearLogs: () => void;
}

// Convert ANSI escape sequences to HTML spans with restrained semantic palette
function parseAnsi(text: string): string {
  const colorMap: Record<string, string> = {
    '\\033\\[36m': '<span class="text-sky-400 font-semibold">',     // SQL
    '\\033\\[34m': '<span class="text-blue-400 font-semibold">',    // Analyst
    '\\033\\[35m': '<span class="text-indigo-400 font-semibold">',  // Chart
    '\\033\\[32m': '<span class="text-emerald-400 font-semibold">', // Conversational
    '\\033\\[33m': '<span class="text-amber-400 font-semibold">',   // Framework
    '\\033\\[31m': '<span class="text-rose-400 font-semibold">',    // Error
    '\\033\\[37m': '<span class="text-slate-200">',                 // White
    '\\033\\[0m': '</span>',                                         // Reset
  };

  let parsed = text.replace(/\\033\[4\dm/g, '');
  for (const [pattern, tag] of Object.entries(colorMap)) {
    parsed = parsed.replace(new RegExp(pattern, 'g'), tag);
  }
  return parsed.replace(/\\033\[\d+m/g, '');
}

export const LogDrawer: React.FC<LogDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Support Escape key to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-80 flex-col border-t border-white/[0.12] bg-[#0c101a]/95 backdrop-blur-3xl shadow-2xl">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
            <Terminal className="h-3.5 w-3.5 text-slate-300" />
            <span>Multi-Agent Live Execution Terminal</span>
          </div>
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
            SSE Stream
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-3 text-xs">
          <label className="flex cursor-pointer items-center space-x-1.5 text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
            />
            <span className="text-[11px]">Auto-scroll</span>
          </label>

          <button
            type="button"
            onClick={onClearLogs}
            title="Bersihkan Log"
            className="flex items-center space-x-1 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Tutup Terminal (Esc)"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed text-slate-300"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            Menunggu aktivitas eksekusi agen. Ajukan pertanyaan untuk melihat stream proses.
          </div>
        ) : (
          logs.map((line, idx) => (
            <div
              key={idx}
              className="py-0.5 hover:bg-slate-900/40"
              dangerouslySetInnerHTML={{ __html: parseAnsi(line) }}
            />
          ))
        )}
      </div>
    </div>
  );
};
