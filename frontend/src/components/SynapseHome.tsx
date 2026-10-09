import React, { useState } from 'react';
import {
  BadgeDollarSign,
  Calendar,
  CloudSun,
  Database,
  Globe,
  Lightbulb,
  MessageSquare,
  Navigation,
  Paperclip,
  Send,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import type { StatsSummary } from '../types/api';

interface SynapseHomeProps {
  stats: StatsSummary | null;
  onSendMessage: (query: string) => void;
  onOpenRecentChat?: (title: string) => void;
  isSubmitting: boolean;
}

export const SynapseHome: React.FC<SynapseHomeProps> = ({
  stats,
  onSendMessage,
  onOpenRecentChat,
  isSubmitting,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('BizInsight 3.6 Flash');
  const [showBanner, setShowBanner] = useState(true);

  // Dynamic greeting based on hour of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

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

  const QUICK_ACTIONS = [
    { icon: TrendingUp, label: 'Revenue Kategori', query: 'Berapa total revenue per kategori produk?' },
    { icon: Trophy, label: 'Top 5 Produk', query: 'Tampilkan 5 produk terlaris berdasarkan unit yang terjual beserta omsetnya.' },
    { icon: Calendar, label: 'Tren Bulanan', query: 'Bagaimana tren penjualan bulanan sepanjang tahun 2026?' },
    { icon: BadgeDollarSign, label: 'Margin Tertinggi', query: 'Produk apa yang memiliki margin keuntungan tertinggi?' },
    { icon: Lightbulb, label: 'Brainstorm', query: 'Berikan evaluasi bisnis dan rekomendasi strategi peningkatan omset toko.' },
  ];

  const RECENT_CHATS = [
    { title: 'Revenue per Kategori Produk', time: '23 hours ago' },
    { title: 'Top 5 Produk Terlaris 2026', time: '2 days ago' },
    { title: 'Analisis Margin & Stok Barang', time: '3 weeks ago' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-4 py-8 sm:py-12">
      {/* 1. Centered Greeting */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {getGreeting()}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          How can I help you analyze business data today?
        </p>
      </div>

      {/* 2. Large Floating Central Command Input Box */}
      <div className="w-full max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/[0.12] bg-[#10141f]/45 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.14)] backdrop-blur-3xl transition focus-within:border-white/[0.22] focus-within:bg-[#121826]/55"
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask BizInsight AI.."
            rows={2}
            disabled={isSubmitting}
            className="w-full resize-none bg-transparent text-sm text-white placeholder-slate-400 outline-none"
          />

          {/* Bottom Controls Row inside input box */}
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
            {/* Model Selector Pill */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none rounded-lg border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 pr-6 text-xs font-medium text-slate-300 outline-none hover:bg-white/[0.08] cursor-pointer"
              >
                <option value="BizInsight 3.6 Flash" className="bg-slate-900 text-white">BizInsight 3.6 Flash</option>
                <option value="Groq Llama 3.3" className="bg-slate-900 text-white">Groq Llama 3.3</option>
                <option value="Gemini 3.1 Pro" className="bg-slate-900 text-white">Gemini 3.1 Pro</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1.5 text-[10px] text-slate-400">
                ▾
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                title="Attach context"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="PostgreSQL Live Access"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                <Globe className="h-4 w-4" />
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

      {/* 3. Quick Action Chips below input */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {QUICK_ACTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(item.query)}
              className="flex items-center space-x-1.5 rounded-xl border border-white/[0.09] bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300 shadow-xs backdrop-blur-xl transition hover:border-white/[0.18] hover:bg-white/[0.10] hover:text-white"
            >
              <Icon className="h-3.5 w-3.5 text-slate-400" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Two Info / Metric Cards Row */}
      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Card 1: Metric / Weather Style Card */}
        <div className="rounded-2xl border border-white/[0.10] bg-[#10141f]/40 p-4 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.10)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-300">
              <span>Jabodetabek</span>
              <Navigation className="h-3 w-3 text-slate-400 rotate-45" />
            </div>
            <CloudSun className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-white tabular-nums">
              {stats ? formatIDR(stats.total_revenue) : 'Rp 992.862.000'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Total Omset Toko | 486 Pesanan Selesai
            </p>
          </div>
        </div>

        {/* Card 2: Context-Aware Chat Info Banner */}
        {showBanner ? (
          <div className="relative rounded-2xl border border-white/[0.10] bg-[#10141f]/40 p-4 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.10)]">
            <button
              type="button"
              onClick={() => setShowBanner(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center space-x-1.5">
              <span className="rounded-full border border-white/[0.1] bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                New
              </span>
            </div>

            <h4 className="mt-2 text-xs font-semibold text-white">
              Context-Aware BI Agent
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Your AI remembers past interactions to provide more relevant and personalized analytics.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.10] bg-[#10141f]/40 p-4 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.10)] flex flex-col justify-center">
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <Database className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-white">PostgreSQL Enterprise Pool</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              6 tabel e-commerce siap dianalisis dengan kecepatan respon sub-detik.
            </p>
          </div>
        )}
      </div>

      {/* 5. Recent Chats Grid */}
      <div className="mt-8 w-full max-w-2xl">
        <div className="mb-3 flex items-center space-x-1 text-xs font-medium text-slate-400">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Your recent chats &gt;</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {RECENT_CHATS.map((chat, idx) => (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (onOpenRecentChat) {
                  onOpenRecentChat(chat.title);
                } else {
                  onSendMessage(chat.title);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (onOpenRecentChat) onOpenRecentChat(chat.title);
                  else onSendMessage(chat.title);
                }
              }}
              className="cursor-pointer rounded-2xl border border-white/[0.09] bg-[#10141f]/40 p-3.5 shadow-md backdrop-blur-2xl transition hover:border-white/[0.18] hover:bg-[#141a28]/55"
            >
              <div className="mb-2 text-slate-400">
                <MessageSquare className="h-4 w-4" />
              </div>
              <p className="truncate text-xs font-medium text-white">{chat.title}</p>
              <p className="mt-1 text-[10px] text-slate-400">{chat.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
