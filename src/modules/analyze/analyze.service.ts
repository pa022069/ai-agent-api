import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GitHubService } from '../github/github.service';
import { AnalysisRequestDto, AnalysisResultFromClaudeDto, ExtractedAnalysisResultDto } from './dto/analysis-request.dto';
import { AnalysisResultDto, RepositoryAnalysisResult } from './dto/analysis-result.dto';
import { AnalysisRequest } from '../../entities/analysis-request.entity';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);

  // 統一的團隊映射配置
  private readonly teamMapping = [
    {
      team: 'Desktop Team',
      keywords: [
        { keyword: 'desktop', weight: 3 },
        { keyword: 'pc', weight: 2 },
        { keyword: 'windows', weight: 2 },
        { keyword: 'mac', weight: 2 },
        { keyword: 'application', weight: 1 },
        { keyword: 'client', weight: 1 }
      ],
      repos: [
        { owner: 'Positive-LLC', repo: 'ai-agent-dev', priority: 1 },
      ]
    }
  ];

  constructor(
    private readonly githubService: GitHubService,
    @InjectRepository(AnalysisRequest)
    private analysisRequestRepository: Repository<AnalysisRequest>,
  ) { }

  async getAnalysisResult(analysisRequest: AnalysisResultFromClaudeDto): Promise<ExtractedAnalysisResultDto> {
    const extractedData = this.extractRelevanceData(analysisRequest.result);
    const findAnalysisRequest = await this.analysisRequestRepository.findOne({
      where: {
        requestId: extractedData.analyzeRequestId,
      },
    });
    if (findAnalysisRequest) {
      const findRepo = findAnalysisRequest.analysisResults.find(result => result.repository === analysisRequest.repository);
      if (findRepo) {
        findRepo.result = extractedData.relevanceScore;
      }
      await this.analysisRequestRepository.save(findAnalysisRequest);
    }
    return {
      repository: analysisRequest.repository,
      issue_number: analysisRequest.issue_number,
      relevanceScore: extractedData.relevanceScore,
      relatedFiles: extractedData.relatedFiles,
      issue_url: `https://github.com/${analysisRequest.repository}/issues/${analysisRequest.issue_number}`,
    };
  }

  async getAnalysisJiraTicket(analysisRequest: any): Promise<any> {
    const { issue } = analysisRequest;
    const ticketKey = issue.key;
    const ticketDescription = issue.fields.description;
    const ticketSummary = issue.fields.summary;
    const ticketSelf = issue.self;

    // 使用整合的智能映射找到最適合的團隊和 repo
    const mappingResult = this.smartMapTicketToTeam(ticketSummary);
    const requestId = `req_${uuidv4().replace(/-/g, '')}`;

    if (mappingResult.bestMatch) {
      const createAnalyzeRequest = await this.analysisRequestRepository.create({
        requestId,
        jiraTicketKey: ticketKey,
        jiraTicketContext: {
          key: ticketKey,
          summary: ticketSummary,
          description: ticketDescription,
          self: ticketSelf,
        },
        analysisResults: mappingResult.allTeamRepos.map(repo => ({ result: '', issue_number: '', issue_url: '', repository: `${repo.owner}/${repo.repo}` })),
      });
      await this.analysisRequestRepository.save(createAnalyzeRequest);

      // 使用 GitHubService 在對應的 repo 建立 issue
      mappingResult.allTeamRepos.forEach(async (repo) => {
        const issueData = {
          issue: {
            key: ticketKey,
            fields: {
              summary: ticketSummary,
              description: ticketDescription,
            },
            self: ticketSelf,
          },
        };

        const createdIssue = await this.githubService.createIssue(
          repo.owner,
          repo.repo,
          issueData,
          requestId
        );

        this.logger.log(`[Info] 成功在 ${repo.owner}/${repo.repo} 建立 issue #${createdIssue.number}`);
        console.log(`Created issue: ${createdIssue.html_url}`);
        const findAnalysisRequest = await this.analysisRequestRepository.findOne({
          where: {
            requestId: createAnalyzeRequest.requestId,
          },
        });
        if (findAnalysisRequest) {
          const findRepo = findAnalysisRequest.analysisResults.find(result => result.repository === `${repo.owner}/${repo.repo}`);
          if (findRepo) {
            findRepo.issue_url = createdIssue.html_url;
          }
          await this.analysisRequestRepository.save(findAnalysisRequest);
        }
      })
    } else {
      this.logger.warn(`[Warning] 無法為 ticket "${ticketKey}" 找到合適的團隊映射，預設映射到 Desktop Team`);

      // 預設映射到 Desktop Team
      const defaultTeamMapping = {
        team: 'Desktop Team',
        owner: 'positive-grid',
        repo: 'ai-agent-dev',
        matchedKeywords: ['default'],
        score: 0
      };

      console.log({
        ticketKey,
        ticketSummary,
        ticketDescription,
        teamMapping: defaultTeamMapping,
        allTeamRepos: [
          { owner: 'positive-grid', repo: 'ai-agent-dev', priority: 1 },
          { owner: 'positive-grid', repo: 'desktop-app', priority: 2 },
          { owner: 'positive-grid', repo: 'client-application', priority: 3 }
        ]
      });
    }
  }

  /**
   * 從分析結果中提取 Relevance Score 和 Related Files
   */
  private extractRelevanceData(result: string): { relevanceScore: string; relatedFiles: string[]; analyzeRequestId: string } {
    const lines = result.split('\n');
    let relevanceScore = '';
    const relatedFiles: string[] = [];
    let analyzeRequestId = '';

    let inRelatedFilesSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 提取 Relevance Score
      if (line.includes('Relevance Score') || line.includes('相關性評分')) {
        // 尋找分數，格式可能是 "95/100" 或 "95分"，只提取數字部分
        const scoreMatch = line.match(/(\d+)\/(\d+)|(\d+)分/);
        if (scoreMatch) {
          // 如果是 "95/100" 格式，取第一個數字；如果是 "95分" 格式，取數字
          relevanceScore = scoreMatch[1] || scoreMatch[3];
        }
        continue;
      }

      // 提取 Related Files
      if (line.includes('Related Files') || line.includes('相關文件') || line.includes('Related Files：')) {
        inRelatedFilesSection = true;
        continue;
      }

      // 提取 Analyze Request ID
      if (line.includes('Analyze Request ID')) {
        const match = line.match(/Analyze Request ID[：:]\s*(.+)/);
        if (match && match[1]) {
          analyzeRequestId = match[1].trim();
        }
        continue;
      }

      // 如果在 Related Files 區段中，提取文件列表
      if (inRelatedFilesSection) {
        // 檢查是否遇到分隔線或其他區段標題
        if (line.startsWith('---') || line.startsWith('##') || line.startsWith('###')) {
          inRelatedFilesSection = false;
          continue;
        }

        // 提取文件路徑（以 "- " 開頭的行）
        if (line.startsWith('- ')) {
          const filePath = line.substring(2).trim();
          if (filePath) {
            relatedFiles.push(filePath);
          }
        }
      }
    }

    return {
      relevanceScore,
      relatedFiles,
      analyzeRequestId,
    };
  }

  /**
   * 步驟1: 建立 analyze issues 並儲存到資料庫
   * @param analysisRequest 分析請求
   * @returns 分析結果
   */
  async analyzeRepositories(analysisRequest: AnalysisRequestDto): Promise<AnalysisResultDto> {
    const requestId = `req_${dayjs().valueOf()}_${Math.random().toString(8)}`;

    this.logger.log(`[Info] 步驟1: 開始建立 analyze issues - Request ID: ${requestId}`);
    this.logger.log(`[Info] Jira Ticket: ${analysisRequest.jiraTicket.key}`);
    this.logger.log(`[Info] 需求描述: ${analysisRequest.requirement}`);
    this.logger.log(`[Info] 目標儲存庫數量: ${analysisRequest.repositories.length}`);

    try {
      // 1. 建立分析請求記錄
      const analysisRequestEntity = this.analysisRequestRepository.create({
        requestId,
        jiraTicketKey: analysisRequest.jiraTicket.key,
        jiraTicketContext: {
          key: analysisRequest.jiraTicket.key,
          summary: analysisRequest.jiraTicket.summary,
          description: analysisRequest.jiraTicket.description,
          self: analysisRequest.jiraTicket.self,
          assignees: analysisRequest.assignees || '',
          labels: analysisRequest.labels || '',
        },
        analysisResults: [],
      });

      const savedRequest = await this.analysisRequestRepository.save(analysisRequestEntity);

      // 2. 在各個儲存庫建立 analyze issue
      const repositoryResults: RepositoryAnalysisResult[] = [];

      for (const repo of analysisRequest.repositories) {
        try {
          const analyzeIssue = await this.createAnalyzeIssue(repo, analysisRequest, requestId);

          const result: RepositoryAnalysisResult = {
            owner: repo.owner,
            repo: repo.repo,
            score: 0,
            analysis: '分析進行中...',
            analyzeIssueNumber: analyzeIssue.number,
            analyzeIssueUrl: analyzeIssue.html_url,
          };

          repositoryResults.push(result);

          this.logger.log(`[Info] 在 ${repo.owner}/${repo.repo} 建立 analyze issue #${analyzeIssue.number}`);
        } catch (error) {
          this.logger.error(`[Error] 在 ${repo.owner}/${repo.repo} 建立 analyze issue 失敗:`, error);

          const result: RepositoryAnalysisResult = {
            owner: repo.owner,
            repo: repo.repo,
            score: 0,
            analysis: `建立 analyze issue 失敗: ${error.message}`,
            analyzeIssueNumber: 0,
            analyzeIssueUrl: '',
          };

          repositoryResults.push(result);
        }
      }

      const result: AnalysisResultDto = {
        requestId,
        jiraTicketKey: analysisRequest.jiraTicket.key,
        repositoryResults,
        bestMatch: { owner: '', repo: '', score: 0 },
        finalIssueNumber: 0,
        finalIssueUrl: '',
        status: 'processing',
      };

      this.logger.log(`[Info] 步驟1完成 - Request ID: ${requestId}, 已建立 ${repositoryResults.length} 個 analyze issues`);
      return result;

    } catch (error) {
      this.logger.error(`[Error] 步驟1失敗 - Request ID: ${requestId}:`, error);

      return {
        requestId,
        jiraTicketKey: analysisRequest.jiraTicket.key,
        repositoryResults: [],
        bestMatch: { owner: '', repo: '', score: 0 },
        finalIssueNumber: 0,
        finalIssueUrl: '',
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * 建立 analyze issue
   */
  private async createAnalyzeIssue(
    repo: { owner: string; repo: string; analysisPrompt: string },
    analysisRequest: AnalysisRequestDto,
    requestId: string
  ) {
    const analyzeIssueData = {
      issue: {
        key: `${analysisRequest.jiraTicket.key}-ANALYZE-${requestId}`,
        fields: {
          summary: `[Analyze] ${analysisRequest.jiraTicket.summary}`,
          description: this.buildAnalyzeIssueDescription(repo.analysisPrompt, analysisRequest, requestId),
        },
        self: analysisRequest.jiraTicket.self,
      },
      labels: 'analyze,claude-code',
    };

    return await this.githubService.createIssue(repo.owner, repo.repo, analyzeIssueData);
  }

  /**
   * 建立最終 issue
   */
  private async createFinalIssue(
    owner: string,
    repo: string,
    analysisRequest: {
      jiraTicket: {
        key: string;
        summary: string;
        description: string;
        self: string;
      };
      assignees?: string;
      labels?: string;
      milestone?: string;
    },
    score: number
  ) {
    const finalIssueData = {
      issue: {
        key: analysisRequest.jiraTicket.key,
        fields: {
          summary: analysisRequest.jiraTicket.summary,
          description: this.buildFinalIssueDescription(analysisRequest, score),
        },
        self: analysisRequest.jiraTicket.self,
      },
      assignees: analysisRequest.assignees,
      labels: analysisRequest.labels,
      milestone: analysisRequest.milestone,
    };

    return await this.githubService.createIssue(owner, repo, finalIssueData);
  }

  /**
   * 建立 analyze issue 的描述內容
   */
  private buildAnalyzeIssueDescription(
    analysisPrompt: string,
    analysisRequest: AnalysisRequestDto,
    requestId: string
  ): string {
    return `
## 分析任務

**Request ID:** ${requestId}
**Jira Ticket:** [${analysisRequest.jiraTicket.key}](${analysisRequest.jiraTicket.self})

### 需求描述
${analysisRequest.requirement}

### 分析指示
${analysisPrompt}

### 評分標準
請根據以下標準給出 0-100 分的評分：
- 技術可行性 (30分)
- 架構匹配度 (25分)  
- 開發複雜度 (20分)
- 維護成本 (15分)
- 業務價值 (10分)

### 回覆格式
請在回覆中包含：
1. 詳細分析結果
2. 總評分（格式：**評分: XX分**）
3. 建議和注意事項

---
*此 issue 將在分析完成後自動清理*
    `.trim();
  }

  /**
   * 建立最終 issue 的描述內容
   */
  private buildFinalIssueDescription(
    analysisRequest: {
      jiraTicket: {
        key: string;
        summary: string;
        description: string;
        self: string;
      };
    },
    score: number
  ): string {
    return `
## 需求說明
${analysisRequest.jiraTicket.description}

## 分析結果
此需求經過多儲存庫分析，最終評分：**${score}分**

## 原始 Jira Ticket
[${analysisRequest.jiraTicket.key}](${analysisRequest.jiraTicket.self})

---
*此 issue 由 AI Agent 自動建立*
    `.trim();
  }

  /**
   * 清理 analyze issues
   */
  private async cleanupAnalyzeIssues(analysisResults: any[]): Promise<void> {
    this.logger.log(`[Info] 開始清理 analyze issues`);

    // TODO: 實作 issue 清理邏輯
    // 可以考慮：
    // 1. 關閉 issue
    // 2. 添加 "已清理" 標籤
    // 3. 在 issue 中留言說明已清理

    this.logger.log(`[Info] 清理 analyze issues 完成`);
  }

  /**
   * 根據 ticket summary 中的關鍵字映射到對應的團隊 repo
   * @param ticketSummary Jira ticket 的摘要
   * @returns 對應的團隊 repo 資訊
   */
  mapTicketToTeamRepo(ticketSummary: string): { owner: string; repo: string; team: string } | null {
    // 將 ticket summary 轉為小寫以便匹配
    const summaryLower = ticketSummary.toLowerCase();

    // 遍歷所有團隊，找到第一個匹配的關鍵字
    for (const teamInfo of this.teamMapping) {
      for (const keywordInfo of teamInfo.keywords) {
        if (summaryLower.includes(keywordInfo.keyword.toLowerCase())) {
          // 返回優先級最高的 repo
          const selectedRepo = teamInfo.repos.sort((a, b) => a.priority - b.priority)[0];
          this.logger.log(`[Info] 找到關鍵字 "${keywordInfo.keyword}" 在 ticket summary 中，映射到 ${teamInfo.team} 的 ${selectedRepo.owner}/${selectedRepo.repo}`);
          return {
            owner: selectedRepo.owner,
            repo: selectedRepo.repo,
            team: teamInfo.team
          };
        }
      }
    }

    // 如果沒有找到匹配的關鍵字，返回 null
    this.logger.warn(`[Warning] 在 ticket summary 中未找到任何團隊關鍵字: "${ticketSummary}"`);
    return null;
  }

  /**
   * 智能映射 ticket 到團隊，返回最佳匹配和所有相關 repo
   * @param ticketSummary Jira ticket 的摘要
   * @returns 包含最佳匹配和所有 repo 的完整映射結果
   */
  smartMapTicketToTeam(ticketSummary: string): {
    bestMatch: { owner: string; repo: string; team: string; matchedKeywords: string[]; score: number } | null;
    allTeamRepos: { owner: string; repo: string; priority: number }[];
    team: string | null;
  } {
    const summaryLower = ticketSummary.toLowerCase();
    let bestMatch: { owner: string; repo: string; team: string; matchedKeywords: string[]; score: number } | null = null;
    let maxScore = 0;
    let matchedTeam: { team: string; keywords: { keyword: string; weight: number }[]; repos: { owner: string; repo: string; priority: number }[] } | null = null;

    // 計算每個團隊的匹配分數
    for (const teamInfo of this.teamMapping) {
      let score = 0;
      let matchedKeywords: string[] = [];

      for (const keywordInfo of teamInfo.keywords) {
        if (summaryLower.includes(keywordInfo.keyword)) {
          score += keywordInfo.weight;
          matchedKeywords.push(keywordInfo.keyword);
        }
      }

      // 如果找到匹配且分數更高，更新最佳匹配
      if (score > maxScore) {
        maxScore = score;
        matchedTeam = teamInfo;
        // 選擇優先級最高的 repo
        const selectedRepo = teamInfo.repos.sort((a, b) => a.priority - b.priority)[0];
        bestMatch = {
          owner: selectedRepo.owner,
          repo: selectedRepo.repo,
          team: teamInfo.team,
          matchedKeywords,
          score
        };
      }
    }

    if (bestMatch && matchedTeam) {
      this.logger.log(`[Info] 智能映射結果: ${bestMatch.team} (${bestMatch.owner}/${bestMatch.repo}) - 匹配關鍵字: [${bestMatch.matchedKeywords.join(', ')}], 分數: ${bestMatch.score}`);
      return {
        bestMatch,
        allTeamRepos: matchedTeam.repos,
        team: matchedTeam.team
      };
    }

    this.logger.warn(`[Warning] 智能映射未找到匹配的團隊: "${ticketSummary}"`);
    return {
      bestMatch: null,
      allTeamRepos: [],
      team: null
    };
  }


  /**
   * 取得分析請求狀態
   * @param requestId 請求 ID
   * @returns 分析請求詳情
   */
  async getAnalysisStatus(requestId: string): Promise<AnalysisRequest | null> {
    return await this.analysisRequestRepository.findOne({
      where: { requestId },
    });
  }
}