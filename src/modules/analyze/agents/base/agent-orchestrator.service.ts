import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from './base-agent.abstract';
import { AgentMessage, InvocationContext, SessionState } from './agent-message.interface';

/**
 * Agent 協調器 - 負責管理 Agent 間的事件驅動協作
 * 使用 requestId 作為命名空間確保多 ticket 隔離
 */
@Injectable()
export class AgentOrchestrator {
  private readonly logger = new Logger(AgentOrchestrator.name);
  private readonly agents: Map<string, BaseAgent> = new Map();
  private readonly sessions: Map<string, SessionState> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.setupEventHandlers();
  }

  /**
   * 註冊 Agent
   * @param agent Agent 實例
   */
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.name, agent);
    this.logger.log(`[Info] 已註冊 Agent: ${agent.name}`);
  }

  /**
   * 建立新的分析會話
   * @param requestId 請求 ID
   * @param ticketKey Jira ticket 編號
   * @returns 會話狀態
   */
  createSession(requestId: string, ticketKey: string): SessionState {
    const session: SessionState = {
      requestId,
      ticketKey,
      status: 'processing',
      startTime: new Date(),
      metadata: {}
    };

    this.sessions.set(requestId, session);
    this.logger.log(`[Info] 建立新會話 - RequestId: ${requestId}, Ticket: ${ticketKey}`);

    return session;
  }

  /**
   * 獲取會話狀態
   * @param requestId 請求 ID
   * @returns 會話狀態
   */
  getSession(requestId: string): SessionState | undefined {
    return this.sessions.get(requestId);
  }

  /**
   * 更新會話狀態
   * @param requestId 請求 ID
   * @param updates 更新內容
   */
  updateSession(requestId: string, updates: Partial<SessionState>): void {
    const session = this.sessions.get(requestId);
    if (session) {
      Object.assign(session, updates);
      this.logger.log(`[Info] 更新會話狀態 - RequestId: ${requestId}, Status: ${session.status}`);
    }
  }

  /**
   * 發送 Agent 間訊息
   * @param message 訊息
   */
  async sendMessage(message: AgentMessage): Promise<AgentMessage> {
    const agent = this.agents.get(message.to);
    if (!agent) {
      throw new Error(`Agent ${message.to} 未註冊`);
    }

    const context: InvocationContext = {
      message,
      session: this.sessions.get(message.requestId || '') || this.createSession(message.requestId || '', 'unknown'),
      metadata: {}
    };

    return await agent.execute(context);
  }

  /**
   * 發送事件（帶 requestId 命名空間）
   * @param eventName 事件名稱
   * @param data 事件資料
   * @param requestId 請求 ID（用於隔離）
   */
  emitEvent(eventName: string, data: any, requestId?: string): void {
    const namespacedEvent = requestId ? `${eventName}.${requestId}` : eventName;
    this.eventEmitter.emit(namespacedEvent, data);
    this.logger.log(`[Info] 發送事件: ${namespacedEvent} - RequestId: ${requestId || 'global'}`);
  }

  /**
   * 監聽事件（帶 requestId 命名空間）
   * @param eventName 事件名稱
   * @param listener 事件監聽器
   * @param requestId 請求 ID（用於隔離）
   */
  onEvent(eventName: string, listener: (data: any) => void, requestId?: string): void {
    const namespacedEvent = requestId ? `${eventName}.${requestId}` : eventName;
    this.eventEmitter.on(namespacedEvent, listener);
    this.logger.log(`[Info] 監聽事件: ${namespacedEvent} - RequestId: ${requestId || 'global'}`);
  }

  /**
   * 移除事件監聽器
   * @param eventName 事件名稱
   * @param listener 事件監聽器
   * @param requestId 請求 ID（用於隔離）
   */
  offEvent(eventName: string, listener: (data: any) => void, requestId?: string): void {
    const namespacedEvent = requestId ? `${eventName}.${requestId}` : eventName;
    this.eventEmitter.off(namespacedEvent, listener);
  }

  /**
   * 設定事件處理器
   */
  private setupEventHandlers(): void {
    // 監聽全域事件（如果需要）
    this.eventEmitter.on('agent.error', (error) => {
      this.logger.error(`[Error] Agent 錯誤:`, error);
    });

    // 監聽所有分析完成事件，觸發相關性評估
    this.eventEmitter.on('all.analyses.completed', async (data) => {
      const { requestId } = data;
      this.logger.log(`[Info] 觸發相關性評估 - RequestId: ${requestId}`);

      try {
        const message = {
          id: uuidv4(),
          from: 'AgentOrchestrator',
          to: 'RelevanceEvaluationAgent',
          type: 'request' as const,
          payload: {},
          timestamp: new Date(),
          requestId
        };

        await this.sendMessage(message);
      } catch (error) {
        this.logger.error(`[Error] 觸發相關性評估失敗 - RequestId: ${requestId}:`, error);
      }
    });

    // 監聽相關性評估完成事件，觸發決策執行
    this.eventEmitter.on('relevance.evaluation.completed', async (data) => {
      const { requestId, evaluationResult } = data;
      this.logger.log(`[Info] 觸發決策執行 - RequestId: ${requestId}`);

      try {
        const message = {
          id: uuidv4(),
          from: 'AgentOrchestrator',
          to: 'DecisionExecutorAgent',
          type: 'request' as const,
          payload: { evaluationResult },
          timestamp: new Date(),
          requestId
        };

        await this.sendMessage(message);
      } catch (error) {
        this.logger.error(`[Error] 觸發決策執行失敗 - RequestId: ${requestId}:`, error);
      }
    });
  }

  /**
   * 清理會話
   * @param requestId 請求 ID
   */
  cleanupSession(requestId: string): void {
    this.sessions.delete(requestId);
    this.logger.log(`[Info] 清理會話 - RequestId: ${requestId}`);
  }

  /**
   * 獲取所有已註冊的 Agent
   * @returns Agent 列表
   */
  getRegisteredAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * 獲取活躍會話
   * @returns 會話列表
   */
  getActiveSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }
}
