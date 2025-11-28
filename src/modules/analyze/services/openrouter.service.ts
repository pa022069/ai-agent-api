import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClaudeTeamAnalysisResultDto } from '../dto/claude-analysis.dto';

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly openRouterApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly openRouterApiKey: string;
  private readonly model = 'anthropic/claude-3.5-sonnet';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
    this.openRouterApiKey = apiKey;
  }

  /**
   * 分析 Jira ticket 並返回團隊匹配結果
   * @param ticketSummary Jira ticket 標題
   * @param ticketDescription Jira ticket 描述
   * @param teamMapping 團隊配置
   * @returns 團隊匹配分析結果
   */
  async analyzeTeamMatch(
    ticketSummary: string,
    ticketDescription: string = '',
    teamMapping: any[] = []
  ): Promise<ClaudeTeamAnalysisResultDto | null> {
    try {
      this.logger.log(`[Info] 開始 AI 分析 ticket: "${ticketSummary}"`);

      const prompt = this.buildTeamMatchPrompt(ticketSummary, ticketDescription, teamMapping);

      const response = await this.callOpenRouterAPI(prompt);

      if (!response) {
        this.logger.warn(`[Warning] OpenRouter API 返回空結果`);
        return null;
      }

      const analysisResult = this.parseOpenRouterResponse(response);

      if (analysisResult) {
        this.logger.log(`[Info] AI 分析成功，最佳匹配: ${analysisResult.bestMatch?.team || '無'}`);
      }

      return analysisResult;
    } catch (error) {
      this.logger.error(`[Error] OpenRouter AI 分析失敗:`, error);
      throw error;
    }
  }

  /**
   * 構建團隊匹配的 prompt
   */
  private buildTeamMatchPrompt(
    ticketSummary: string,
    ticketDescription: string,
    teamMapping: any[]
  ): string {
    const teamConfigText = teamMapping.map(team => {
      const keywords = team.keywords.map(k => k.keyword).join(', ');
      const repos = team.repos.map(r => `${r.owner}/${r.repo}`).join(', ');
      return `- **${team.team}**: ${keywords} (儲存庫: ${repos})`;
    }).join('\n');

    return `你是一個團隊分配專家。請分析以下 Jira ticket 並選擇最適合的開發團隊。

## Ticket 信息

**標題：** ${ticketSummary}
**描述：** ${ticketDescription || '無描述'}

## 可用團隊配置

${teamConfigText}

## 分析要求

請根據 ticket 內容，從以上團隊中選擇最適合的：

## 輸出格式

請以 JSON 格式返回分析結果：

\`\`\`json
{
  "bestMatch": {
    "team": "Desktop Team",
    "owner": "Positive-LLC",
    "repo": "ai-agent-dev",
    "score": 85,
    "confidence": 0.9,
    "reasoning": "這個需求涉及桌面應用開發，Desktop Team 最適合..."
  },
  "allTeamRepos": [
    {
      "owner": "Positive-LLC",
      "repo": "ai-agent-dev",
      "priority": 1,
      "score": 85,
      "reasoning": "主要匹配理由..."
    },
    {
      "owner": "Positive-LLC",
      "repo": "jira-analyze-dev",
      "priority": 2,
      "score": 70,
      "reasoning": "次要匹配理由..."
    }
  ]
}
\`\`\`

**注意：**
- 如果沒有明顯匹配的團隊，請返回 null
- 分數範圍：0-100
- 信心度範圍：0-1
- 必須提供詳細的推理過程
- 只返回 JSON，不要包含其他文字`;
  }

  /**
   * 調用 OpenRouter API
   */
  private async callOpenRouterAPI(prompt: string): Promise<string | null> {
    try {
      const response = await fetch(this.openRouterApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': 'https://github.com/positive-grid/ai-agent-api',
          'X-Title': 'AI Agent API',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (error) {
      this.logger.error(`[Error] OpenRouter API 調用失敗:`, error);
      throw error;
    }
  }

  /**
   * 評估相關性 - 綜合評估所有分析結果並選出最相關的儲存庫
   * @param ticketSummary Jira ticket 標題
   * @param ticketDescription Jira ticket 描述
   * @param evaluationData 評估資料（包含所有 repo 的分析結果）
   * @returns 相關性評估結果
   */
  async evaluateRelevance(
    ticketSummary: string,
    ticketDescription: string,
    evaluationData: any
  ): Promise<any> {
    try {
      this.logger.log(`[Info] 開始相關性評估 - Ticket: "${ticketSummary}"`);

      const prompt = this.buildRelevanceEvaluationPrompt(ticketSummary, ticketDescription, evaluationData);
      const response = await this.callOpenRouterAPI(prompt);

      if (!response) {
        this.logger.warn(`[Warning] OpenRouter API 返回空結果`);
        return null;
      }

      const evaluationResult = this.parseRelevanceEvaluationResponse(response);

      if (evaluationResult) {
        this.logger.log(`[Info] 相關性評估成功，選中: ${evaluationResult.selectedRepository}`);
      }

      return evaluationResult;
    } catch (error) {
      this.logger.error(`[Error] 相關性評估失敗:`, error);
      throw error;
    }
  }

  /**
   * 構建相關性評估的 prompt
   */
  private buildRelevanceEvaluationPrompt(
    ticketSummary: string,
    ticketDescription: string,
    evaluationData: any
  ): string {
    const analysisResultsText = evaluationData.analysisResults.map((result: any) => {
      return `### ${result.repository}
- **Issue Body 內容**: ${result.issueBody || '無內容'}
- **相關檔案**: ${(result.relatedFiles || []).join(', ') || '無'}
- **Issue URL**: ${result.issueUrl}`;
    }).join('\n\n');

    return `你是一個技術分析專家。請根據 Jira ticket 的需求和各儲存庫的 GitHub issue 內容分析，選出最相關的儲存庫。

## Jira Ticket 資訊

**標題：** ${ticketSummary}
**描述：** ${ticketDescription || '無描述'}

## 各儲存庫的 GitHub Issue 分析

${analysisResultsText}

## 評估要求

請仔細分析每個儲存庫的 GitHub issue 內容，綜合考慮以下因素：

1. **內容相關性** - GitHub issue 中提到的技術、功能、架構是否與 Jira ticket 需求高度相關
2. **技術匹配度** - issue 內容中涉及的技術棧、工具、框架是否適合實現此需求
3. **業務邏輯匹配** - issue 中討論的功能模組、業務流程是否與需求相符
4. **實作可行性** - 基於 issue 內容，該儲存庫是否有足夠的技術基礎來實現此需求
5. **相關檔案重要性** - 相關檔案是否對實現需求有實質幫助

## 分析重點

- **不要僅依賴評分** - 重點分析 issue body 的實際內容
- **關注技術細節** - 仔細閱讀 issue 中提到的技術實現細節
- **考慮業務場景** - 分析 issue 討論的功能是否與需求場景匹配
- **評估實作複雜度** - 基於 issue 內容判斷實現此需求的複雜度

## 輸出格式

請以 JSON 格式返回評估結果：

\`\`\`json
{
  "selectedRepository": "Positive-LLC/ai-agent-dev",
  "relevanceScore": 95,
  "reasoning": "根據 GitHub issue 內容分析，此儲存庫最適合實現此需求。issue 中詳細討論了相關的技術架構和實現方案，涉及的核心技術棧與需求高度匹配...",
  "allReposEvaluation": [
    {
      "repository": "Positive-LLC/ai-agent-dev",
      "score": 95,
      "reasoning": "issue 內容顯示該儲存庫已有相關的技術基礎，討論的功能模組與需求高度相關，技術棧完全匹配"
    },
    {
      "repository": "Positive-LLC/jira-analyze-dev",
      "score": 70,
      "reasoning": "issue 內容部分相關，但主要關注點與需求略有偏差，技術實現方案不夠完整"
    }
  ]
}
\`\`\`

**注意：**
- 只返回 JSON，不要包含其他文字
- 必須基於 issue body 的實際內容進行分析
- 提供詳細的推理過程，說明為什麼選擇該儲存庫
- 分數範圍：0-100
- 必須選出一個最相關的儲存庫`;
  }

  /**
   * 解析相關性評估回應
   */
  private parseRelevanceEvaluationResponse(response: string): any {
    try {
      let jsonStr = response.trim();

      // 嘗試提取 JSON 代碼塊中的內容
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // 如果沒有代碼塊，嘗試直接解析整個回應
      const parsed = JSON.parse(jsonStr);

      // 驗證必要字段
      if (!parsed.selectedRepository || !parsed.relevanceScore || !parsed.reasoning) {
        this.logger.warn(`[Warning] 相關性評估回應格式不正確: ${JSON.stringify(parsed)}`);
        return null;
      }

      this.logger.log(`[Info] 成功解析相關性評估回應，選中: ${parsed.selectedRepository}`);
      return parsed;
    } catch (error) {
      this.logger.error(`[Error] 解析相關性評估回應失敗:`, error);
      this.logger.error(`[Error] 原始回應內容: ${response}`);
      return null;
    }
  }

  /**
   * 解析 OpenRouter 回應
   */
  private parseOpenRouterResponse(response: string): ClaudeTeamAnalysisResultDto | null {
    try {
      let jsonStr = response.trim();

      // 嘗試提取 JSON 代碼塊中的內容
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // 如果沒有代碼塊，嘗試直接解析整個回應
      const parsed = JSON.parse(jsonStr);

      // 驗證必要字段
      if (!parsed.allTeamRepos || !Array.isArray(parsed.allTeamRepos)) {
        this.logger.warn(`[Warning] 回應格式不正確: ${JSON.stringify(parsed)}`);
        return null;
      }

      this.logger.log(`[Info] 成功解析 AI 回應，找到 ${parsed.allTeamRepos.length} 個團隊儲存庫`);
      return parsed as ClaudeTeamAnalysisResultDto;
    } catch (error) {
      this.logger.error(`[Error] 解析 OpenRouter 回應失敗:`, error);
      this.logger.error(`[Error] 原始回應內容: ${response}`);
      return null;
    }
  }
}
