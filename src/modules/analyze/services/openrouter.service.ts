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
