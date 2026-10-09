import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BarChart3,
  Bot,
  FileSpreadsheet,
  Send,
  Sparkles,
  Terminal,
  User,
} from 'lucide-react';
import type { ChatMessageItem } from '../types/api';

interface ChatWindowProps {
  messages: ChatMessageItem[];
  isSubmitting: boolean;
  onSendMessage: (msg: string) => void;
  onSelectMessageArtifact: (msg: ChatMessageItem) => void;
  selectedMessageId?: string;
}

const QUICK_PROMPTS = [
  { icon: '📈', label: 'Revenue per Kategori', prompt: 'Berapa total revenue per kategori produk?' },
  { icon: '🏆', label: 'Top 5 Produk Terlaris', prompt: 'Tampilkan 5 produk terlaris berdasarkan unit yang terjual.' },
  { icon: '📊', label: 'Tren Penjualan Bulanan', prompt: 'Bagaimana tren penjualan bulanan sepanjang tahun 2026?' },
  { icon: '🗺️', label: 'Performa per Wilayah', prompt: 'Berapa kontribusi revenue dari masing-masing wilayah?' },
  { icon: '💰', label: 'Produk Margin Tertinggi', prompt: 'Produk apa yang memiliki margin keuntungan tertinggi?' },
];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isSubmitting,
  onSendMessage,
  onSelectMessageArtifact,
  selectedMessageId,
}) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSubmitting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950/30">
      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-xl shadow-indigo-500/20">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-base font-bold text-white sm:text-lg">
              Selamat datang di BizInsight AI
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-400 sm:text-sm">
              Asisten Business Intelligence otomatis berbasis Multi-Agent. Tanyakan apa saja tentang penjualan, produk, dan pelanggan toko Anda.
            </p>

            {/* Quick Suggestions Cards */}
            <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(qp.prompt)}
                  className="flex items-center space-x-2.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-left text-xs text-slate-300 transition hover:border-indigo-500/50 hover:bg-slate-850 hover:text-white"
                >
                  <span className="text-base">{qp.icon}</span>
                  <span className="font-medium">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSelected = msg.id === selectedMessageId;

            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isUser
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-sm'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Bubble Body */}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed sm:text-sm ${
                  isUser
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'border border-slate-800/80 bg-slate-900/90 text-slate-200 shadow-sm'
                }`}>
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div>
                      {/* Markdown AI Reply */}
                      <div className="prose prose-invert prose-xs max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-cyan-400">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.reply || 'Sedang memproses...'}
                        </ReactMarkdown>
                      </div>

                      {/* Mini Artifact Badges inside Assistant Bubble */}
                      {(msg.chart || msg.sql_query || msg.raw_data) && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-2.5">
                          <span className="text-[11px] font-medium text-slate-400">Artefak:</span>
                          {msg.chart && (
                            <button
                              onClick={() => onSelectMessageArtifact(msg)}
                              className={`flex items-center space-x-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                                isSelected
                                  ? 'bg-indigo-500 text-white'
                                  : 'bg-indigo-950/60 text-indigo-300 border border-indigo-700/50 hover:bg-indigo-900/60'
                              }`}
                            >
                              <BarChart3 className="h-3 w-3" />
                              <span>Lihat Grafik</span>
                            </button>
                          )}
                          {msg.sql_query && (
                            <button
                              onClick={() => onSelectMessageArtifact(msg)}
                              className="flex items-center space-x-1 rounded-md border border-cyan-700/50 bg-cyan-950/60 px-2 py-0.5 text-[11px] font-medium text-cyan-300 transition hover:bg-cyan-900/60"
                            >
                              <Terminal className="h-3 w-3" />
                              <span>Lihat SQL</span>
                            </button>
                          )}
                          {msg.raw_data && (
                            <button
                              onClick={() => onSelectMessageArtifact(msg)}
                              className="flex items-center space-x-1 rounded-md border border-emerald-700/50 bg-emerald-950/60 px-2 py-0.5 text-[11px] font-medium text-emerald-300 transition hover:bg-emerald-900/60"
                            >
                              <FileSpreadsheet className="h-3 w-3" />
                              <span>Data ({msg.raw_data.row_count} baris)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Thinking State */}
        {isSubmitting && (
          <div className="flex items-start space-x-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-sm">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="flex items-center space-x-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3 text-xs text-slate-300 shadow-sm">
              <span className="flex space-x-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="font-medium text-slate-300">BizInsight AI sedang menalar data...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Strip above input */}
      {messages.length > 0 && (
        <div className="flex space-x-2 overflow-x-auto border-t border-slate-800/60 bg-slate-900/20 px-4 py-2">
          {QUICK_PROMPTS.slice(0, 3).map((qp, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(qp.prompt)}
              disabled={isSubmitting}
              className="shrink-0 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-400 transition hover:border-slate-700 hover:text-slate-200 disabled:opacity-50"
            >
              <span className="mr-1">{qp.icon}</span>
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Box Footer */}
      <div className="border-t border-slate-800/80 bg-slate-950/80 p-3 sm:p-4 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan analisis bisnis (misal: 'Berapa rata-rata transaksi pesanan?')..."
            rows={1}
            disabled={isSubmitting}
            className="w-full resize-none rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 pr-12 text-xs text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 sm:text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSubmitting}
            className="absolute right-2.5 rounded-lg bg-indigo-600 p-2 text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-slate-500">
          Tekan <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[9px]">Enter</kbd> untuk mengirim, <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[9px]">Shift+Enter</kbd> untuk baris baru.
        </p>
      </div>
    </div>
  );
};
