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
        <div className="mb-2.5 rounded-md border border-slate-800 bg-slate-900 p-3 text-slate-500">
          <BarChart3 className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold text-slate-300">Panel Visualisasi & Artefak</p>
        <p className="mt-1 text-xs text-slate-400">
          Grafik Plotly, hasil query SQL, dan tabel data akan ditampilkan secara otomatis di sini saat agen menyelesaikan analisis.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      {/* Top Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-3 py-1.5">
        <div className="flex space-x-1">
          {chart && (
            <button
              type="button"
              onClick={() => setActiveTab('chart')}
              className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                activeTab === 'chart'
                  ? 'border border-slate-700 bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
              <span>Grafik ({chartType})</span>
            </button>
          )}

          {sqlQuery && (
            <button
              type="button"
              onClick={() => setActiveTab('sql')}
              className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                activeTab === 'sql'
                  ? 'border border-slate-700 bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5 text-slate-400" />
              <span>Query SQL</span>
            </button>
          )}

          {rawData && (
            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                activeTab === 'data'
                  ? 'border border-slate-700 bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
              <span>Data ({rawData.row_count} baris)</span>
            </button>
          )}
        </div>

        {/* Copy SQL Button if on SQL Tab */}
        {activeTab === 'sql' && sqlQuery && (
          <button
            type="button"
            onClick={handleCopySql}
            className="flex items-center space-x-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
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
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {/* 1. Chart Tab */}
        {activeTab === 'chart' && chart && (
          <div>
            <PlotlyChart chart={chart} />
          </div>
        )}

        {/* 2. SQL Tab */}
        {activeTab === 'sql' && sqlQuery && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 font-mono text-xs text-slate-200">
            <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">PostgreSQL Generated Query</span>
              {rawData?.execution_time_ms !== undefined && (
                <span className="text-emerald-400 tabular-nums">
                  {rawData.execution_time_ms} ms
                </span>
              )}
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-blue-300">
              <code>{sqlQuery}</code>
            </pre>
          </div>
        )}

        {/* 3. Data Table Tab */}
        {activeTab === 'data' && rawData && (
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
            <div className="flex justify-between border-b border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-400">
              <span className="font-medium text-slate-300">Total: {rawData.row_count} baris</span>
              {rawData.execution_time_ms !== undefined && (
                <span className="tabular-nums">Eksekusi: {rawData.execution_time_ms} ms</span>
              )}
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    {rawData.columns.map((col, idx) => (
                      <th key={idx} className="border-b border-slate-800 px-3 py-2 font-semibold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rawData.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-850 hover:bg-slate-800/40 transition">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="whitespace-nowrap px-3 py-1.5 tabular-nums text-slate-300">
                          {typeof cell === 'number'
                            ? cell.toLocaleString('id-ID')
                            : cell === null
                            ? '-'
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
