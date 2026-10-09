import { useEffect, useState } from 'react';
import { ArtifactViewer } from './components/ArtifactViewer';
import { ChatWindow } from './components/ChatWindow';
import { DbExplorerModal } from './components/DbExplorerModal';
import { Header } from './components/Header';
import { LogDrawer } from './components/LogDrawer';
import { Sidebar } from './components/Sidebar';
import {
  deleteSession,
  fetchChatHistory,
  fetchHealth,
  fetchSessions,
  fetchStats,
  sendChatMessage,
  subscribeLogsStream,
} from './services/api';
import type {
  ChatMessageItem,
  HealthResponse,
  SessionSummary,
  StatsSummary,
} from './types/api';

export function App() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Active Artifact State (displayed in the right panel)
  const [activeArtifact, setActiveArtifact] = useState<{
    messageId?: string;
    chart: any | null;
    chartType: string;
    sqlQuery: string | null;
    rawData: any | null;
  }>({
    chart: null,
    chartType: 'none',
    sqlQuery: null,
    rawData: null,
  });

  // Modal / Drawer Toggles
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);
  const [isDbExplorerOpen, setIsDbExplorerOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // 1. Initial Load & SSE Stream Subscription
  useEffect(() => {
    loadHealthAndStats();
    loadSessionsList();
    loadMessagesForSession(activeSessionId);

    // Subscribe to real-time log SSE stream
    const unsubscribe = subscribeLogsStream(
      (newLog) => {
        setLogs((prev) => [...prev.slice(-250), newLog]);
      },
      (err) => console.warn('SSE log stream notice:', err)
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // 2. Load Messages when Active Session Changes
  useEffect(() => {
    loadMessagesForSession(activeSessionId);
  }, [activeSessionId]);

  const loadHealthAndStats = async () => {
    setIsLoadingStats(true);
    try {
      const [hRes, sRes] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchStats().catch(() => null),
      ]);
      if (hRes) setHealth(hRes);
      if (sRes?.stats) setStats(sRes.stats);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadSessionsList = async () => {
    try {
      const res = await fetchSessions();
      setSessions(res.sessions || []);
    } catch (e) {
      console.warn('Failed to load sessions:', e);
    }
  };

  const loadMessagesForSession = async (sessId: string) => {
    try {
      const res = await fetchChatHistory(sessId);
      const msgs = res.messages || [];
      setMessages(msgs);

      // Find the last assistant message with an artifact and set it active
      const lastWithArtifact = [...msgs].reverse().find((m) => m.role === 'assistant' && (m.chart || m.sql_query));
      if (lastWithArtifact) {
        setActiveArtifact({
          messageId: lastWithArtifact.id,
          chart: lastWithArtifact.chart,
          chartType: lastWithArtifact.chart_type || 'none',
          sqlQuery: lastWithArtifact.sql_query ?? null,
          rawData: lastWithArtifact.raw_data,
        });
      } else {
        setActiveArtifact({
          chart: null,
          chartType: 'none',
          sqlQuery: null,
          rawData: null,
        });
      }
    } catch (e) {
      console.warn('Failed to load session history:', e);
      setMessages([]);
    }
  };

  // 3. User sends a message
  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isSubmitting) return;

    const tempUserMsg: ChatMessageItem = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsSubmitting(true);

    try {
      const res = await sendChatMessage(userText, activeSessionId);

      const assistantMsg: ChatMessageItem = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        reply: res.reply,
        sql_query: res.sql_query,
        raw_data: res.raw_data,
        chart: res.chart,
        chart_type: res.chart_type,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Automatically display newly generated artifact in right panel
      if (res.chart || res.sql_query || res.raw_data) {
        setActiveArtifact({
          messageId: assistantMsg.id,
          chart: res.chart,
          chartType: res.chart_type,
          sqlQuery: res.sql_query,
          rawData: res.raw_data,
        });
      }

      // Refresh session list to update titles/counts
      loadSessionsList();
      // Silently refresh KPI stats
      fetchStats().then((s) => s?.stats && setStats(s.stats)).catch(() => {});
    } catch (error: any) {
      const errMsg: ChatMessageItem = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        reply: `⚠️ Terjadi kendala saat memproses: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectMessageArtifact = (msg: ChatMessageItem) => {
    setActiveArtifact({
      messageId: msg.id,
      chart: msg.chart,
      chartType: msg.chart_type || 'none',
      sqlQuery: msg.sql_query ?? null,
      rawData: msg.raw_data,
    });
  };

  const handleNewSession = () => {
    const newId = `session_${Date.now().toString().slice(-6)}`;
    setActiveSessionId(newId);
    setMessages([]);
    setActiveArtifact({
      chart: null,
      chartType: 'none',
      sqlQuery: null,
      rawData: null,
    });
  };

  const handleDeleteSession = async (sessId: string) => {
    try {
      await deleteSession(sessId);
      await loadSessionsList();
      if (activeSessionId === sessId) {
        handleNewSession();
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        stats={stats}
        health={health}
        onRefreshStats={loadHealthAndStats}
        onToggleDbExplorer={() => setIsDbExplorerOpen(true)}
        onToggleLogDrawer={() => setIsLogDrawerOpen((prev) => !prev)}
        isLogDrawerOpen={isLogDrawerOpen}
        isLoadingStats={isLoadingStats}
      />

      {/* Main Workspace: Sidebar + Chat + Artifact Viewer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Sessions) */}
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
        />

        {/* Center: Chat Window */}
        <main className="flex flex-1 flex-col overflow-hidden border-r border-slate-800/80">
          <ChatWindow
            messages={messages}
            isSubmitting={isSubmitting}
            onSendMessage={handleSendMessage}
            onSelectMessageArtifact={handleSelectMessageArtifact}
            selectedMessageId={activeArtifact.messageId}
          />
        </main>

        {/* Right: Artifact Viewer (Chart, SQL, Raw Data) */}
        <section className="hidden w-[460px] shrink-0 flex-col overflow-hidden p-3 lg:flex xl:w-[540px]">
          <ArtifactViewer
            chart={activeArtifact.chart}
            chartType={activeArtifact.chartType}
            sqlQuery={activeArtifact.sqlQuery}
            rawData={activeArtifact.rawData}
          />
        </section>
      </div>

      {/* Slide-over Terminal Log Drawer (SSE Stream) */}
      <LogDrawer
        isOpen={isLogDrawerOpen}
        onClose={() => setIsLogDrawerOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
      />

      {/* Database Explorer Modal */}
      <DbExplorerModal
        isOpen={isDbExplorerOpen}
        onClose={() => setIsDbExplorerOpen(false)}
      />
    </div>
  );
}

export default App;
