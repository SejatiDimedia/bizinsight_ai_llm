import React, { useEffect, useState } from 'react';
import { Database, FileCode, RefreshCw, Table, X } from 'lucide-react';
import { fetchSchema, fetchTableData } from '../services/api';
import type { TableDataResponse } from '../types/api';

interface DbExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABLES = ['categories', 'regions', 'products', 'customers', 'orders', 'order_items'];

export const DbExplorerModal: React.FC<DbExplorerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'ddl'>('tables');
  const [selectedTable, setSelectedTable] = useState(TABLES[0]);
  const [limit, setLimit] = useState(15);
  const [tableData, setTableData] = useState<TableDataResponse['data'] | null>(null);
  const [schemaDdl, setSchemaDdl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Keyboard Escape support
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

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'tables') {
      loadTableData(selectedTable, limit);
    } else {
      loadSchema();
    }
  }, [isOpen, activeTab, selectedTable, limit]);

  const loadTableData = async (tbl: string, lim: number) => {
    setIsLoading(true);
    try {
      const res = await fetchTableData(tbl, lim);
      setTableData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchema = async () => {
    setIsLoading(true);
    try {
      const res = await fetchSchema();
      setSchemaDdl(res.schema_ddl);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
    >
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-3">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-800 bg-slate-950 text-blue-400">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Database Explorer</h3>
              <p className="text-[11px] text-slate-400">Inspeksi data dan skema PostgreSQL e-commerce</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Tab Toggle */}
            <div className="flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('tables')}
                className={`flex items-center space-x-1.5 rounded px-3 py-1 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                  activeTab === 'tables'
                    ? 'border border-slate-700 bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                <span>Tabel Data</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ddl')}
                className={`flex items-center space-x-1.5 rounded px-3 py-1 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                  activeTab === 'ddl'
                    ? 'border border-slate-700 bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Skema DDL</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              title="Tutup (Esc)"
              className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {activeTab === 'tables' ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Table Selector Sidebar */}
            <div className="w-52 shrink-0 border-r border-slate-800 bg-slate-950 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Pilih Tabel
              </span>
              <div className="mt-2 space-y-1">
                {TABLES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTable(t)}
                    className={`flex w-full items-center space-x-2 rounded-md px-2.5 py-1.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                      selectedTable === t
                        ? 'border border-slate-700 bg-slate-900 font-medium text-white'
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <Table className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table Data Preview */}
            <div className="flex flex-1 flex-col overflow-hidden p-3 sm:p-4">
              {/* Controls */}
              <div className="mb-2.5 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white">Tabel: {selectedTable}</span>
                  <span className="tabular-nums">({tableData?.row_count || 0} baris dimuat)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>Limit:</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-auto rounded-md border border-slate-800 bg-slate-900/40">
                {isLoading ? (
                  <div className="flex h-64 items-center justify-center space-x-2 text-slate-400">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                    <span>Memuat data tabel...</span>
                  </div>
                ) : tableData && tableData.columns.length > 0 ? (
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-400">
                      <tr>
                        {tableData.columns.map((col, idx) => (
                          <th key={idx} className="border-b border-slate-800 px-3 py-2 font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {tableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-850 hover:bg-slate-800/40 transition">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="whitespace-nowrap px-3 py-1.5 tabular-nums text-slate-300">
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
                ) : (
                  <div className="flex h-64 items-center justify-center text-slate-500">
                    Tidak ada data dalam tabel ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* DDL Tab */
          <div className="flex-1 overflow-y-auto p-4">
            <div className="rounded-md border border-slate-800 bg-slate-900 p-3.5 font-mono text-xs text-blue-300 leading-relaxed">
              <pre className="whitespace-pre-wrap">{schemaDdl || 'Memuat skema DDL...'}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
