import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from './base/base-agent.abstract';
import { AgentMessage, AgentCapability } from './base/agent-message.interface';
import { AnalysisRequest } from '../../../entities/analysis-request.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 分析結果收集 Agent
 * 負責收集和追蹤各 repo 的分析結果，確保多 ticket 隔離
 */
@Injectable()
export class AnalysisCollectorAgent extends BaseAgent {
  readonly name = 'AnalysisCollectorAgent';
  readonly description = '收集和追蹤各儲存庫的分析結果，管理分析進度';
  readonly capabilities: AgentCapability[] = [
    {
      name: 'analysis-tracking',
      description: '追蹤分析進度和狀態'
    },
    {
      name: 'result-collection',
      description: '收集和驗證分析結果'
    },
    {
      name: 'completion-detection',
      description: '檢測所有分析是否完成'
    }
  ];

  constructor(
    @InjectRepository(AnalysisRequest)
    private analysisRequestRepository: Repository<AnalysisRequest>,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  /**
   * 處理分析結果
   * @param input 輸入訊息
   * @returns 處理結果
   */
  async process(input: AgentMessage): Promise<AgentMessage> {
    const { repository, relevanceScore, relatedFiles, issue_url } = input.payload;
    const requestId = input.requestId;

    if (!requestId) {
      throw new Error('RequestId 是必需的');
    }

    this.logger.log(`[${this.name}] 收到分析結果 - RequestId: ${requestId}, Repo: ${repository}`);

    try {
      // 1. 更新資料庫中的分析結果
      await this.updateAnalysisResult(requestId, repository, relevanceScore, relatedFiles, issue_url);

      // 2. 檢查是否所有分析都已完成
      const isAllCompleted = await this.checkAllAnalysesCompleted(requestId);

      if (isAllCompleted) {
        this.logger.log(`[${this.name}] 所有分析已完成 - RequestId: ${requestId}`);

        // 3. 觸發相關性評估事件
        this.eventEmitter.emit('all.analyses.completed', {
          requestId,
          timestamp: new Date()
        });

        // 4. 更新會話狀態（這裡我們不直接操作會話，由 AgentOrchestrator 處理）
      }

      return {
        id: uuidv4(),
        from: this.name,
        to: input.from,
        type: 'response',
        payload: {
          success: true,
          repository,
          isAllCompleted,
          message: isAllCompleted ? '所有分析已完成，已觸發相關性評估' : '分析結果已記錄'
        },
        timestamp: new Date(),
        correlationId: input.correlationId,
        requestId
      };

    } catch (error) {
      this.logger.error(`[${this.name}] 處理分析結果失敗 - RequestId: ${requestId}:`, error);

      return {
        id: uuidv4(),
        from: this.name,
        to: input.from,
        type: 'response',
        payload: {
          success: false,
          error: error.message,
          repository
        },
        timestamp: new Date(),
        correlationId: input.correlationId,
        requestId
      };
    }
  }

  /**
   * 更新分析結果到資料庫
   */
  private async updateAnalysisResult(
    requestId: string,
    repository: string,
    relevanceScore: string,
    relatedFiles: string[],
    issue_url: string
  ): Promise<void> {
    const analysisRequest = await this.analysisRequestRepository.findOne({
      where: { requestId }
    });

    if (!analysisRequest) {
      throw new Error(`找不到分析請求: ${requestId}`);
    }

    // 更新對應 repo 的結果
    const repoResult = analysisRequest.analysisResults.find(
      result => result.repository === repository
    );

    if (repoResult) {
      repoResult.result = relevanceScore;
      if (relatedFiles) {
        repoResult.relatedFiles = relatedFiles;
      }
      repoResult.issue_url = issue_url;

      await this.analysisRequestRepository.save(analysisRequest);
      this.logger.log(`[${this.name}] 已更新分析結果 - RequestId: ${requestId}, Repo: ${repository}, Score: ${relevanceScore}`);
    } else {
      this.logger.warn(`[${this.name}] 找不到對應的 repo 結果 - RequestId: ${requestId}, Repo: ${repository}`);
    }
  }

  /**
   * 檢查是否所有分析都已完成
   */
  private async checkAllAnalysesCompleted(requestId: string): Promise<boolean> {
    const analysisRequest = await this.analysisRequestRepository.findOne({
      where: { requestId }
    });

    if (!analysisRequest) {
      return false;
    }

    // 檢查所有 repo 是否都有分析結果
    const allCompleted = analysisRequest.analysisResults.every(result =>
      result.result && result.result.trim() !== ''
    );

    this.logger.log(`[${this.name}] 分析完成檢查 - RequestId: ${requestId}, 完成狀態: ${allCompleted}, 總數: ${analysisRequest.analysisResults.length}`);

    return allCompleted;
  }

  /**
   * 獲取分析進度
   * @param requestId 請求 ID
   * @returns 分析進度資訊
   */
  async getAnalysisProgress(requestId: string): Promise<{
    total: number;
    completed: number;
    percentage: number;
    results: any[];
  }> {
    const analysisRequest = await this.analysisRequestRepository.findOne({
      where: { requestId }
    });

    if (!analysisRequest) {
      throw new Error(`找不到分析請求: ${requestId}`);
    }

    const total = analysisRequest.analysisResults.length;
    const completed = analysisRequest.analysisResults.filter(result =>
      result.result && result.result.trim() !== ''
    ).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      percentage,
      results: analysisRequest.analysisResults
    };
  }
}
