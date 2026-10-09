import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BadgeDollarSign,
  BarChart3,
  Bot,
  Calendar,
  FileSpreadsheet,
  Globe,
  MapPin,
  Paperclip,
  Send,
  Terminal,
  TrendingUp,
  Trophy,
  User,
} from 'lucide-react';
import { SynapseHome } from './SynapseHome';
import type { ChatMessageItem, StatsSummary } from '../types/api';

interface ChatWindowProps {
  messages: ChatMessageItem[];
  stats: StatsSummary | null;
  isSubmitting: boolean;
  onSendMessage: (msg: string) => void;
  onSelectMessageArtifact: (msg: ChatMessageItem) => void;
  selectedMessageId?: string;
}

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: 'Revenue per Kategori', prompt: 'Berapa total revenue per kategori produk?' },
  { icon: Trophy, label: 'Top 5 Produk Terlaris', prompt: 'Tampilkan 5 produk terlaris berdasarkan unit yang terjual beserta omsetnya.' },
  { icon: Calendar, label: 'Tren Penjualan Bulanan', prompt: 'Bagaimana tren penjualan bulanan sepanjang tahun 2026?' },
  { icon: MapPin, label: 'Performa per Wilayah', prompt: 'Berapa kontribusi revenue dari masing-masing wilayah?' },
  { icon: BadgeDollarSign, label: 'Produk Margin Tertinggi', prompt: 'Produk apa yang memiliki margin keuntungan tertinggi?' },
];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  stats,
  isSubmitting,
  onSendMessage,
  onSelectMessageArtifact,
  selectedMessageId,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('BizInsight 3.6 Flash');
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

  // If no messages yet, show Synapse Home screen
  if (messages.length === 0) {
    return (
      <div className="flex h-full w-full flex-col overflow-y-auto">
        <SynapseHome
          stats={stats}
          onSendMessage={onSendMessage}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSelected = msg.id === selectedMessageId;

          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs shadow-xs ${
                  isUser
                    ? 'border-white/[0.12] bg-white/[0.10] text-white'
                    : 'border-white/[0.10] bg-white/[0.06] text-slate-200'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Bubble Body */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed sm:text-sm shadow-xl ${
                  isUser
                    ? 'border border-white/[0.14] bg-white/[0.10] text-white backdrop-blur-2xl'
                    : 'border border-white/[0.10] bg-[#10141f]/50 text-slate-200 backdrop-blur-2xl'
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
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-2.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Artefak:</span>
                        {msg.chart && (
                          <button
                            type="button"
                            onClick={() => onSelectMessageArtifact(msg)}
                            className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                              isSelected
                                ? 'border border-white/[0.2] bg-white/[0.15] text-white shadow-xs'
                                : 'border border-white/[0.08] bg-white/[0.05] text-slate-200 hover:bg-white/[0.1] hover:text-white'
                            }`}
                          >
                            <BarChart3 className="h-3 w-3 text-blue-400" />
                            <span>Lihat Grafik</span>
                          </button>
                        )}
                        {msg.sql_query && (
                          <button
                            type="button"
                            onClick={() => onSelectMessageArtifact(msg)}
                            className="flex items-center space-x-1 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-white/[0.1] hover:text-white"
                          >
                            <Terminal className="h-3 w-3 text-slate-400" />
                            <span>Lihat SQL</span>
                          </button>
                        )}
                        {msg.raw_data && (
                          <button
                            type="button"
                            onClick={() => onSelectMessageArtifact(msg)}
                            className="flex items-center space-x-1 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-white/[0.1] hover:text-white"
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
        })}

        {/* Processing State */}
        {isSubmitting && (
          <div className="flex items-start space-x-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.06] text-slate-200">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center space-x-2.5 rounded-2xl border border-white/[0.10] bg-[#10141f]/50 px-4 py-2.5 text-xs text-slate-300 shadow-lg backdrop-blur-2xl">
              <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
              <span className="font-medium text-slate-300">BizInsight AI sedang menalar data PostgreSQL...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Strip above input */}
      <div className="flex space-x-2 overflow-x-auto px-4 py-1.5 sm:px-6">
        {QUICK_PROMPTS.slice(0, 4).map((qp, idx) => {
          const IconComponent = qp.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(qp.prompt)}
              disabled={isSubmitting}
              className="flex shrink-0 items-center space-x-1.5 rounded-xl border border-white/[0.09] bg-white/[0.05] px-2.5 py-1 text-[11px] text-slate-300 backdrop-blur-xl transition hover:border-white/[0.18] hover:bg-white/[0.10] hover:text-white disabled:opacity-50"
            >
              <IconComponent className="h-3 w-3 text-slate-400" />
              <span>{qp.label}</span>
            </button>
          );
        })}
      </div>

      {/* Synapse Floating Command Input Box Footer */}
      <div className="p-4 sm:px-6 sm:pb-5">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/[0.12] bg-[#10141f]/45 p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.14)] backdrop-blur-3xl transition focus-within:border-white/[0.22] focus-within:bg-[#121826]/55"
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask BizInsight AI.."
            rows={1}
            disabled={isSubmitting}
            className="w-full resize-none bg-transparent text-xs text-white placeholder-slate-400 outline-none sm:text-sm"
          />

          <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none rounded-lg border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 pr-5 text-[11px] font-medium text-slate-300 outline-none hover:bg-white/[0.08] cursor-pointer"
              >
                <option value="BizInsight 3.6 Flash" className="bg-slate-900 text-white">BizInsight 3.6 Flash</option>
                <option value="Groq Llama 3.3" className="bg-slate-900 text-white">Groq Llama 3.3</option>
              </select>
              <span className="pointer-events-none absolute right-1.5 top-1.5 text-[9px] text-slate-400">
                ▾
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                title="Attach context"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="PostgreSQL Live Access"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                <Globe className="h-3.5 w-3.5" />
              </button>
              <button
                type="submit"
                disabled={!inputText.trim() || isSubmitting}
                className="flex items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.12] px-3 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-white/[0.2] disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
