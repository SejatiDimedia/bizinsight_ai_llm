import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BadgeDollarSign,
  BarChart3,
  Bot,
  Calendar,
  FileSpreadsheet,
  MapPin,
  Send,
  Terminal,
  TrendingUp,
  Trophy,
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
  { icon: TrendingUp, label: 'Revenue per Kategori', prompt: 'Berapa total revenue per kategori produk?' },
  { icon: Trophy, label: 'Top 5 Produk Terlaris', prompt: 'Tampilkan 5 produk terlaris berdasarkan unit yang terjual.' },
  { icon: Calendar, label: 'Tren Penjualan Bulanan', prompt: 'Bagaimana tren penjualan bulanan sepanjang tahun 2026?' },
  { icon: MapPin, label: 'Performa per Wilayah', prompt: 'Berapa kontribusi revenue dari masing-masing wilayah?' },
  { icon: BadgeDollarSign, label: 'Produk Margin Tertinggi', prompt: 'Produk apa yang memiliki margin keuntungan tertinggi?' },
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
    <div className="flex h-full flex-col overflow-hidden bg-slate-950">
      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-blue-400">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">
              BizInsight AI Workbench
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              Asisten Business Intelligence otomatis. Ajukan pertanyaan dalam bahasa natural untuk menganalisis data e-commerce secara langsung dari PostgreSQL.
            </p>

            {/* Quick Suggestions Cards */}
            <div className="mt-5 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK_PROMPTS.map((qp, idx) => {
                const IconComponent = qp.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSendMessage(qp.prompt)}
                    className="flex items-center space-x-2.5 rounded-md border border-slate-800 bg-slate-900/60 p-2.5 text-left text-xs text-slate-300 transition hover:border-slate-700 hover:bg-slate-850 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <IconComponent className="h-4 w-4 shrink-0 text-blue-400" />
                    <span className="font-medium text-slate-200">{qp.label}</span>
                  </button>
                );
              })}
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
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs ${
                    isUser
                      ? 'border-slate-700 bg-slate-800 text-slate-200'
                      : 'border-slate-800 bg-slate-900 text-blue-400'
                  }`}
                >
                  {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                {/* Bubble Body */}
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed sm:text-sm ${
                    isUser
                      ? 'border border-blue-600/40 bg-blue-600/20 text-slate-100'
                      : 'border border-slate-800 bg-slate-900/90 text-slate-200'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div>
                      {/* Markdown AI Reply */}
                      <div className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed text-slate-200">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ ...props }) => (
                              <div className="markdown-table-wrapper">
                                <table {...props} />
                              </div>
                            ),
                            img: () => null,
                            ul: ({ ...props }) => <ul className="list-disc pl-4 space-y-1 my-1.5 text-slate-300" {...props} />,
                            ol: ({ ...props }) => <ol className="list-decimal pl-4 space-y-1 my-1.5 text-slate-300" {...props} />,
                            li: ({ ...props }) => <li className="text-slate-300" {...props} />,
                            strong: ({ ...props }) => <strong className="font-semibold text-white" {...props} />,
                          }}
                        >
                          {msg.reply || 'Sedang memproses...'}
                        </ReactMarkdown>
                      </div>

                      {/* Mini Artifact Badges inside Assistant Bubble */}
                      {(msg.chart || msg.sql_query || msg.raw_data) && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 pt-2">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Artefak:</span>
                          {msg.chart && (
                            <button
                              type="button"
                              onClick={() => onSelectMessageArtifact(msg)}
                              className={`flex items-center space-x-1 rounded px-2 py-0.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600 hover:text-white'
                              }`}
                            >
                              <BarChart3 className="h-3 w-3" />
                              <span>Grafik</span>
                            </button>
                          )}
                          {msg.sql_query && (
                            <button
                              type="button"
                              onClick={() => onSelectMessageArtifact(msg)}
                              className="flex items-center space-x-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-200 transition hover:border-slate-600 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                            >
                              <Terminal className="h-3 w-3 text-slate-400" />
                              <span>SQL</span>
                            </button>
                          )}
                          {msg.raw_data && (
                            <button
                              type="button"
                              onClick={() => onSelectMessageArtifact(msg)}
                              className="flex items-center space-x-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-200 transition hover:border-slate-600 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                            >
                              <FileSpreadsheet className="h-3 w-3 text-slate-400" />
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

        {/* Processing State: Clean analytical indicator, no bouncy dots */}
        {isSubmitting && (
          <div className="flex items-start space-x-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-blue-400">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center space-x-2.5 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-300">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-medium text-slate-300">BizInsight AI sedang menalar data PostgreSQL...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Strip above input */}
      {messages.length > 0 && (
        <div className="flex space-x-2 overflow-x-auto border-t border-slate-800/80 bg-slate-950 px-4 py-2">
          {QUICK_PROMPTS.slice(0, 3).map((qp, idx) => {
            const IconComponent = qp.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSendMessage(qp.prompt)}
                disabled={isSubmitting}
                className="flex shrink-0 items-center space-x-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-slate-700 hover:text-slate-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <IconComponent className="h-3 w-3 text-slate-400" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Input Box Footer */}
      <div className="border-t border-slate-800 bg-slate-950 p-3 sm:p-4">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan analisis bisnis (misal: 'Berapa omset per kategori produk?')..."
            rows={1}
            disabled={isSubmitting}
            className="w-full resize-none rounded-md border border-slate-800 bg-slate-900 px-3.5 py-2.5 pr-11 text-xs text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSubmitting}
            className="absolute right-2 rounded-md bg-blue-600 p-1.5 text-white transition hover:bg-blue-500 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
        <p className="mt-1 text-center text-[10px] text-slate-400">
          Tekan <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[9px] text-slate-300">Enter</kbd> untuk mengirim, <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[9px] text-slate-300">Shift+Enter</kbd> untuk baris baru.
        </p>
      </div>
    </div>
  );
};
