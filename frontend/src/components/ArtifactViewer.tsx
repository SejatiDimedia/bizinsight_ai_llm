import React, { useState } from 'react';
import { BarChart3, Check, Copy, FileSpreadsheet, Terminal } from 'lucide-react';
import { PlotlyChart } from './PlotlyChart';

interface ArtifactViewerProps {
  chart: any | null;
  chartType?: string;
  sqlQuery?: string | null;
  rawData?: {
    columns: string[];
    rows: any[][];
    row_count: number;
    execution_time_ms?: number;
  } | null;
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  chart,
  chartType = 'none',
  sqlQuery,
  rawData,
}) => {
  // Default active tab: chart if exists, otherwise sql, otherwise table
  const defaultTab = chart ? 'chart' : sqlQuery ? 'sql' : 'data';
  const [activeTab, setActiveTab] = useState<'chart' | 'sql' | 'data'>(defaultTab);
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    if (!sqlQuery) return;
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasAnyArtifact = Boolean(chart || sqlQuery || rawData);

  if (!hasAnyArtifact) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
        <div className="mb-3 rounded-full border border-slate-800 bg-slate-900/60 p-4">
          <BarChart3 className="h-6 w-6 text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-400">Belum Ada Artefak Analisis</p>
        <p className="mt-1 text-xs text-slate-500">
          Ajukan pertanyaan seperti "Berapa omset per kategori?" untuk melihat grafik otomatis dan query SQL.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-sm">
      {/* Top Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-3 py-2">
        <div className="flex space-x-1.5">
          {chart && (
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                activeTab === 'chart'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
              <span>Grafik ({chartType})</span>
            </button>
          )}

          {sqlQuery && (
            <button
              onClick={() => setActiveTab('sql')}
              className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                activeTab === 'sql'
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              <span>SQL Query</span>
            </button>
          )}

          {rawData && (
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                activeTab === 'data'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Tabel Data ({rawData.row_count})</span>
            </button>
          )}
        </div>

        {/* Copy SQL Button if on SQL Tab */}
        {activeTab === 'sql' && sqlQuery && (
          <button
            onClick={handleCopySql}
            className="flex items-center space-x-1 rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700/60"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Salin</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 1. Chart Tab */}
        {activeTab === 'chart' && chart && (
          <div>
            <PlotlyChart chart={chart} />
          </div>
        )}

        {/* 2. SQL Tab */}
        {activeTab === 'sql' && sqlQuery && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 font-mono text-xs text-slate-200 shadow-inner">
            <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>PostgreSQL Generated Query</span>
              {rawData?.execution_time_ms !== undefined && (
                <span className="text-emerald-400">⚡ {rawData.execution_time_ms} ms</span>
              )}
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-cyan-300">
              <code>{sqlQuery}</code>
            </pre>
          </div>
        )}

        {/* 3. Data Table Tab */}
        {activeTab === 'data' && rawData && (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
            <div className="border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-400 flex justify-between">
              <span>Total: {rawData.row_count} baris</span>
              {rawData.execution_time_ms !== undefined && (
                <span>Waktu query: {rawData.execution_time_ms} ms</span>
              )}
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="sticky top-0 bg-slate-850 bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    {rawData.columns.map((col, idx) => (
                      <th key={idx} className="border-b border-slate-800 px-3 py-2.5 font-semibold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rawData.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-800/30 transition">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="whitespace-nowrap px-3 py-2 text-slate-300">
                          {typeof cell === 'number'
                            ? cell.toLocaleString('id-ID')
                            : cell === null
                            ? '—'
                            : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
