import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from './base/base-agent.abstract';
import { AgentMessage, AgentCapability } from './base/agent-message.interface';
import { AnalysisRequest } from '../../../entities/analysis-request.entity';
import { OpenRouterService } from '../services/openrouter.service';
import { GitHubService } from '../../github/github.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 相關性評估 Agent
 * 使用 OpenRouter AI 對所有分析結果進行綜合相關性評估
 */
@Injectable()
export class RelevanceEvaluationAgent extends BaseAgent {
  readonly name = 'RelevanceEvaluationAgent';
  readonly description = '使用 OpenRouter AI 對所有分析結果進行綜合相關性評估';
  readonly capabilities: AgentCapability[] = [
    {
      name: 'relevance-analysis',
      description: '使用 AI 進行相關性分析'
    },
    {
      name: 'multi-repo-evaluation',
      description: '綜合評估多個儲存庫的分析結果'
    },
    {
      name: 'best-match-selection',
      description: '選出最相關的儲存庫'
    }
  ];

  constructor(
    @InjectRepository(AnalysisRequest)
    private analysisRequestRepository: Repository<AnalysisRequest>,
    private openRouterService: OpenRouterService,
    private githubService: GitHubService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  /**
   * 處理相關性評估請求
   * @param input 輸入訊息
   * @returns 評估結果
   */
  async process(input: AgentMessage): Promise<AgentMessage> {
    const requestId = input.requestId;

    if (!requestId) {
      throw new Error('RequestId 是必需的');
    }

    this.logger.log(`[${this.name}] 開始相關性評估 - RequestId: ${requestId}`);

    try {
      // 1. 獲取所有分析結果
      const analysisRequest = await this.analysisRequestRepository.findOne({
        where: { requestId }
      });

      if (!analysisRequest) {
        throw new Error(`找不到分析請求: ${requestId}`);
      }

      // 2. 準備評估資料（包含 GitHub issue body 內容）
      const evaluationData = await this.prepareEvaluationData(analysisRequest);

      // 3. 使用 OpenRouter AI 進行相關性評估
      const evaluationResult = await this.openRouterService.evaluateRelevance(
        analysisRequest.jiraTicketContext.summary,
        analysisRequest.jiraTicketContext.description,
        evaluationData
      );

      if (!evaluationResult) {
        throw new Error('OpenRouter AI 評估失敗');
      }

      // 4. 更新資料庫中的評估結果
      await this.updateEvaluationResult(requestId, evaluationResult);

      this.logger.log(`[${this.name}] 相關性評估完成 - RequestId: ${requestId}, 選中: ${evaluationResult.selectedRepository}`);

      // 5. 觸發決策執行事件
      this.eventEmitter.emit('relevance.evaluation.completed', {
        requestId,
        evaluationResult,
        timestamp: new Date()
      });

      return {
        id: uuidv4(),
        from: this.name,
        to: input.from,
        type: 'response',
        payload: {
          success: true,
          evaluationResult,
          message: '相關性評估完成'
        },
        timestamp: new Date(),
        correlationId: input.correlationId,
        requestId
      };

    } catch (error) {
      this.logger.error(`[${this.name}] 相關性評估失敗 - RequestId: ${requestId}:`, error);

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
   * 準備評估資料（包含 GitHub issue body 內容）
   */
  private async prepareEvaluationData(analysisRequest: AnalysisRequest): Promise<any> {
    const analysisResults: Array<{
      repository: string;
      relevanceScore: string;
      relatedFiles: string[];
      issueUrl: string;
      issueBody: string;
    }> = [];

    for (const result of analysisRequest.analysisResults) {
      let issueBody = '';

      // 如果有 issue URL，獲取 GitHub issue 的 body 內容
      if (result.issue_url) {
        try {
          const issue = await this.githubService.getIssueByUrl(result.issue_url);
          issueBody = issue.body || '';
          this.logger.log(`[${this.name}] 獲取 issue body 成功 - ${result.repository}, 長度: ${issueBody.length}`);
        } catch (error) {
          this.logger.warn(`[${this.name}] 獲取 issue body 失敗 - ${result.repository}: ${error.message}`);
          issueBody = '無法獲取 issue 內容';
        }
      }

      analysisResults.push({
        repository: result.repository,
        relevanceScore: result.result,
        relatedFiles: result.relatedFiles || [],
        issueUrl: result.issue_url,
        issueBody: issueBody
      });
    }

    return {
      jiraTicket: {
        key: analysisRequest.jiraTicketKey,
        summary: analysisRequest.jiraTicketContext.summary,
        description: analysisRequest.jiraTicketContext.description
      },
      analysisResults
    };
  }

  /**
   * 更新評估結果到資料庫
   */
  private async updateEvaluationResult(requestId: string, evaluationResult: any): Promise<void> {
    const analysisRequest = await this.analysisRequestRepository.findOne({
      where: { requestId }
    });

    if (!analysisRequest) {
      throw new Error(`找不到分析請求: ${requestId}`);
    }

    // 更新評估結果（這裡需要擴展 entity 來支援這些欄位）
    // 暫時先記錄到 metadata 中
    if (!analysisRequest.metadata) {
      analysisRequest.metadata = {};
    }

    analysisRequest.metadata.evaluationResult = evaluationResult;
    analysisRequest.metadata.evaluationCompletedAt = new Date();

    await this.analysisRequestRepository.save(analysisRequest);
    this.logger.log(`[${this.name}] 已更新評估結果 - RequestId: ${requestId}`);
  }

  /**
   * 獲取評估結果
   * @param requestId 請求 ID
   * @returns 評估結果
   */
  async getEvaluationResult(requestId: string): Promise<any> {
    const analysisRequest = await this.analysisRequestRepository.findOne({
      where: { requestId }
    });

    if (!analysisRequest || !analysisRequest.metadata?.evaluationResult) {
      return null;
    }

    return analysisRequest.metadata.evaluationResult;
  }
}
