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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-5 py-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Database Explorer</h3>
              <p className="text-xs text-slate-400">Inspeksi data & skema PostgreSQL e-commerce</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Tab Toggle */}
            <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs font-medium">
              <button
                onClick={() => setActiveTab('tables')}
                className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition ${
                  activeTab === 'tables' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                <span>Tabel Data</span>
              </button>
              <button
                onClick={() => setActiveTab('ddl')}
                className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition ${
                  activeTab === 'ddl' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Skema DDL</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {activeTab === 'tables' ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Table Selector Sidebar */}
            <div className="w-52 shrink-0 border-r border-slate-800 bg-slate-900/30 p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Pilih Tabel
              </span>
              <div className="mt-2 space-y-1">
                {TABLES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTable(t)}
                    className={`flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                      selectedTable === t
                        ? 'bg-cyan-500/15 text-cyan-300 font-medium border border-cyan-500/30'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <Table className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table Data Preview */}
            <div className="flex flex-1 flex-col overflow-hidden p-4">
              {/* Controls */}
              <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white">Tabel: {selectedTable}</span>
                  <span>({tableData?.row_count || 0} baris dimuat)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>Limit:</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-900/40">
                {isLoading ? (
                  <div className="flex h-64 items-center justify-center space-x-2 text-slate-400">
                    <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                    <span>Memuat data tabel...</span>
                  </div>
                ) : tableData && tableData.columns.length > 0 ? (
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400">
                      <tr>
                        {tableData.columns.map((col, idx) => (
                          <th key={idx} className="border-b border-slate-800 px-3 py-2.5 font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {tableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/30 transition">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="whitespace-nowrap px-3 py-2">
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
          <div className="flex-1 overflow-y-auto p-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 font-mono text-xs text-cyan-300 leading-relaxed shadow-inner">
              <pre className="whitespace-pre-wrap">{schemaDdl || 'Memuat skema DDL...'}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
