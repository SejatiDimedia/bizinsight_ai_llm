import type {
  ChatHistoryResponse,
  ChatResponse,
  HealthResponse,
  SchemaResponse,
  SessionListResponse,
  StatsResponse,
  TableDataResponse,
} from '../types/api';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error(`Fetch stats failed: ${res.statusText}`);
  return res.json();
}

export async function sendChatMessage(message: string, sessionId: string = 'default'): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || `Chat request failed: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchChatHistory(sessionId: string = 'default'): Promise<ChatHistoryResponse> {
  const res = await fetch(`${API_BASE}/chat/history?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`Fetch history failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSessions(): Promise<SessionListResponse> {
  const res = await fetch(`${API_BASE}/chat/sessions`);
  if (!res.ok) throw new Error(`Fetch sessions failed: ${res.statusText}`);
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Delete session failed: ${res.statusText}`);
}

export async function resetSession(sessionId: string = 'default'): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`Reset session failed: ${res.statusText}`);
}

export async function fetchTableData(tableName: string, limit: number = 10): Promise<TableDataResponse> {
  const res = await fetch(`${API_BASE}/tables/${encodeURIComponent(tableName)}?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch table data: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSchema(): Promise<SchemaResponse> {
  const res = await fetch(`${API_BASE}/schema`);
  if (!res.ok) throw new Error(`Failed to fetch schema: ${res.statusText}`);
  return res.json();
}

export function subscribeLogsStream(
  onLog: (logText: string) => void,
  onError?: (err: any) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE}/logs/stream`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.log) {
        onLog(data.log);
      }
    } catch {
      if (event.data) {
        onLog(event.data);
      }
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}
