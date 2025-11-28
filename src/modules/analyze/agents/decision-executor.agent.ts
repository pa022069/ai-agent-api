import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from './base/base-agent.abstract';
import { AgentMessage, AgentCapability } from './base/agent-message.interface';
import { AnalysisRequest } from '../../../entities/analysis-request.entity';
import { GitHubService } from '../../github/github.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 決策執行 Agent
 * 負責執行最終決策：保留最相關的 repo，關閉其他低分 issues
 */
@Injectable()
export class DecisionExecutorAgent extends BaseAgent {
  readonly name = 'DecisionExecutorAgent';
  readonly description = '執行最終決策：保留最相關的儲存庫，關閉其他低分 issues';
  readonly capabilities: AgentCapability[] = [
    {
      name: 'final-decision',
      description: '執行最終決策'
    },
    {
      name: 'issue-management',
      description: '管理 GitHub issues（關閉、保留）'
    },
    {
      name: 'cleanup-operations',
      description: '清理低分 issues'
    }
  ];

  constructor(
    @InjectRepository(AnalysisRequest)
    private analysisRequestRepository: Repository<AnalysisRequest>,
    private githubService: GitHubService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  /**
   * 處理決策執行請求
   * @param input 輸入訊息
   * @returns 執行結果
   */
  async process(input: AgentMessage): Promise<AgentMessage> {
    const { evaluationResult } = input.payload;
    const requestId = input.requestId;

    if (!requestId) {
      throw new Error('RequestId 是必需的');
    }

    this.logger.log(`[${this.name}] 開始執行最終決策 - RequestId: ${requestId}`);

    try {
      // 1. 獲取分析請求
      const analysisRequest = await this.analysisRequestRepository.findOne({
        where: { requestId }
      });

      if (!analysisRequest) {
        throw new Error(`找不到分析請求: ${requestId}`);
      }

      // 2. 執行決策邏輯
      const executionResult = await this.executeDecision(analysisRequest, evaluationResult);

      // 3. 更新會話狀態為完成
      this.eventEmitter.emit('decision.executed', {
        requestId,
        executionResult,
        timestamp: new Date()
      });

      // 4. 觸發決策完成事件
      this.eventEmitter.emit('analysis.workflow.completed', {
        requestId,
        executionResult,
        timestamp: new Date()
      });

      this.logger.log(`[${this.name}] 決策執行完成 - RequestId: ${requestId}`);

      return {
        id: uuidv4(),
        from: this.name,
        to: input.from,
        type: 'response',
        payload: {
          success: true,
          executionResult,
          message: '決策執行完成'
        },
        timestamp: new Date(),
        correlationId: input.correlationId,
        requestId
      };

    } catch (error) {
      this.logger.error(`[${this.name}] 決策執行失敗 - RequestId: ${requestId}:`, error);

      // 更新會話狀態為失敗
      this.eventEmitter.emit('analysis.workflow.failed', {
        requestId,
        error: error.message,
        timestamp: new Date()
      });

      return {
        id: uuidv4(),
        from: this.name,
        to: input.from,
        type: 'response',
        payload: {
          success: false,
          error: error.message
        },
        timestamp: new Date(),
        correlationId: input.correlationId,
        requestId
      };
    }
  }

  /**
   * 執行決策邏輯
   */
  private async executeDecision(analysisRequest: AnalysisRequest, evaluationResult: any): Promise<any> {
    const selectedRepository = evaluationResult.selectedRepository;
    const allReposEvaluation = evaluationResult.allReposEvaluation || [];

    this.logger.log(`[${this.name}] 選中的儲存庫: ${selectedRepository}`);

    // 1. 找出需要關閉的低分 issues
    const reposToClose = analysisRequest.analysisResults.filter(result =>
      result.repository !== selectedRepository && result.issue_url
    );

    this.logger.log(`[${this.name}] 需要關閉的 issues 數量: ${reposToClose.length}`);

    // 2. 關閉低分 issues
    const closeResults: Array<{
      repository: string;
      issueUrl: string;
      status: string;
      success: boolean;
      error?: string;
    }> = [];
    for (const repo of reposToClose) {
      try {
        await this.githubService.closeIssueByUrl(repo.issue_url);
        closeResults.push({
          repository: repo.repository,
          issueUrl: repo.issue_url,
          status: 'closed',
          success: true
        });
        this.logger.log(`[${this.name}] 成功關閉 issue: ${repo.repository} - ${repo.issue_url}`);
      } catch (error) {
        closeResults.push({
          repository: repo.repository,
          issueUrl: repo.issue_url,
          status: 'failed',
          success: false,
          error: error.message
        });
        this.logger.error(`[${this.name}] 關閉 issue 失敗: ${repo.repository} - ${repo.issue_url}`, error);
      }
    }

    // 3. 更新資料庫狀態
    await this.updateAnalysisRequestStatus(analysisRequest, selectedRepository, closeResults);

    // 4. 準備執行結果
    const executionResult = {
      selectedRepository,
      relevanceScore: evaluationResult.relevanceScore,
      reasoning: evaluationResult.reasoning,
      closedIssues: closeResults,
      totalRepos: analysisRequest.analysisResults.length,
      closedCount: closeResults.filter(r => r.success).length,
      failedCount: closeResults.filter(r => !r.success).length,
      executionTime: new Date()
    };

    return executionResult;
  }

  /**
   * 更新分析請求狀態
   */
  private async updateAnalysisRequestStatus(
    analysisRequest: AnalysisRequest,
    selectedRepository: string,
    closeResults: any[]
  ): Promise<void> {
    // 更新 metadata
    if (!analysisRequest.metadata) {
      analysisRequest.metadata = {};
    }

    analysisRequest.metadata.selectedRepository = selectedRepository;
    analysisRequest.metadata.closeResults = closeResults;
    analysisRequest.metadata.decisionExecutedAt = new Date();

    // 更新狀態
    analysisRequest.status = true; // 標記為已完成

    await this.analysisRequestRepository.save(analysisRequest);
    this.logger.log(`[${this.name}] 已更新分析請求狀態 - RequestId: ${analysisRequest.requestId}`);
  }

  /**
   * 獲取決策執行結果
   * @param requestId 請求 ID
   * @returns 執行結果
   */
  async getExecutionResult(requestId: string): Promise<any> {
    const analysisRequest = await this.analysisRequestRepository.findOne({
      where: { requestId }
    });

    if (!analysisRequest || !analysisRequest.metadata?.selectedRepository) {
      return null;
    }

    return {
      selectedRepository: analysisRequest.metadata.selectedRepository,
      closeResults: analysisRequest.metadata.closeResults,
      decisionExecutedAt: analysisRequest.metadata.decisionExecutedAt,
      status: analysisRequest.status
    };
  }
}
