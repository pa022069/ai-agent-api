/**
 * Agent 間通信的標準訊息格式
 */
export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification' | 'delegation';
  payload: any;
  timestamp: Date;
  correlationId?: string;
  requestId?: string; // 用於多 ticket 隔離
}

/**
 * Agent 執行上下文
 */
export interface InvocationContext {
  message: AgentMessage;
  session: SessionState;
  metadata: Record<string, any>;
}

/**
 * 會話狀態
 */
export interface SessionState {
  requestId: string;
  ticketKey: string;
  status: 'processing' | 'completed' | 'failed';
  startTime: Date;
  metadata: Record<string, any>;
}

/**
 * Agent 能力描述
 */
export interface AgentCapability {
  name: string;
  description: string;
  inputSchema?: any;
  outputSchema?: any;
}
