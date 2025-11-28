import { Logger } from '@nestjs/common';
import { AgentMessage, InvocationContext, AgentCapability } from './agent-message.interface';

/**
 * Agent 基類 - 所有 Agent 都應該繼承此類
 */
export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly capabilities: AgentCapability[];

  protected readonly logger = new Logger(this.constructor.name);

  /**
   * 處理 Agent 訊息
   * @param input 輸入訊息
   * @returns 處理結果訊息
   */
  abstract process(input: AgentMessage): Promise<AgentMessage>;

  /**
   * 執行 Agent 任務
   * @param context 執行上下文
   * @returns 執行結果訊息
   */
  async execute(context: InvocationContext): Promise<AgentMessage> {
    try {
      this.logger.log(`[${this.name}] 開始執行任務 - RequestId: ${context.message.requestId}`);

      const result = await this.process(context.message);

      this.logger.log(`[${this.name}] 任務執行完成 - RequestId: ${context.message.requestId}`);
      return result;
    } catch (error) {
      this.logger.error(`[${this.name}] 任務執行失敗 - RequestId: ${context.message.requestId}:`, error);
      throw error;
    }
  }

  /**
   * 驗證 Agent 能力
   * @param capability 要驗證的能力
   * @returns 是否支援該能力
   */
  hasCapability(capability: string): boolean {
    return this.capabilities.some(cap => cap.name === capability);
  }

  /**
   * 獲取 Agent 資訊
   * @returns Agent 基本資訊
   */
  getInfo(): { name: string; description: string; capabilities: string[] } {
    return {
      name: this.name,
      description: this.description,
      capabilities: this.capabilities.map(cap => cap.name)
    };
  }
}
