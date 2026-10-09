export interface StatsSummary {
  total_products: number;
  total_customers: number;
  completed_orders: number;
  total_revenue: number;
}

export interface StatsResponse {
  success: boolean;
  stats: StatsSummary;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content?: string | null;
  reply?: string | null;
  sql_query?: string | null;
  raw_data?: {
    columns: string[];
    rows: any[][];
    row_count: number;
    execution_time_ms: number;
  } | null;
  chart?: any | null;
  chart_type?: string;
  timestamp: string;
}

export interface ChatHistoryResponse {
  success: boolean;
  session_id: string;
  messages: ChatMessageItem[];
}

export interface SessionSummary {
  session_id: string;
  title: string;
  message_count: number;
  last_active: string;
}

export interface SessionListResponse {
  success: boolean;
  sessions: SessionSummary[];
}

export interface ChatResponse {
  success: boolean;
  session_id: string;
  reply: string;
  sql_query: string;
  raw_data?: {
    columns: string[];
    rows: any[][];
    row_count: number;
    execution_time_ms: number;
  } | null;
  chart?: any | null;
  chart_type: string;
  error?: string | null;
}

export interface TableDataResponse {
  success: boolean;
  table: string;
  limit: number;
  data: {
    columns: string[];
    rows: any[][];
    row_count: number;
    execution_time_ms?: number;
    error?: string;
  };
}

export interface SchemaResponse {
  success: boolean;
  schema_ddl: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  database_connected: boolean;
  database_error?: string | null;
  timestamp: string;
}
