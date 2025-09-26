import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { CreateIssueDto } from './dto/create-issue.dto';
import { GitHubIssueResponseDto } from './dto/github-issue-response.dto';

@Injectable()
export class GitHubService {
  private readonly githubApiUrl = 'https://api.github.com';
  private readonly githubToken: string;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }
    this.githubToken = token;
  }

  /**
   * 將 Jira 描述內容轉換為 Markdown 格式
   * @param jiraDescription Jira 原始描述內容
   * @returns 轉換後的 Markdown 格式內容
   */
  private convertJiraToMarkdown(jiraDescription: string): string {
    if (!jiraDescription) {
      return '';
    }

    let markdown = jiraDescription;

    // 處理換行符 - Jira 使用 \n，Markdown 需要雙換行
    markdown = markdown.replace(/\n/g, '\n\n');

    // 處理標題 - Jira 的 h1. h2. h3. 等轉換為 Markdown 標題
    markdown = markdown.replace(/^h1\.\s*(.+)$/gm, '# $1');
    markdown = markdown.replace(/^h2\.\s*(.+)$/gm, '## $1');
    markdown = markdown.replace(/^h3\.\s*(.+)$/gm, '### $1');
    markdown = markdown.replace(/^h4\.\s*(.+)$/gm, '#### $1');
    markdown = markdown.replace(/^h5\.\s*(.+)$/gm, '##### $1');
    markdown = markdown.replace(/^h6\.\s*(.+)$/gm, '###### $1');

    // 處理粗體 - Jira 的 *text* 轉換為 Markdown 的 **text**
    markdown = markdown.replace(/\*([^*]+)\*/g, '**$1**');

    // 處理斜體 - Jira 的 _text_ 轉換為 Markdown 的 *text*
    markdown = markdown.replace(/_([^_]+)_/g, '*$1*');

    // 處理刪除線 - Jira 的 -text- 轉換為 Markdown 的 ~~text~~
    markdown = markdown.replace(/-([^-]+)-/g, '~~$1~~');

    // 處理代碼塊 - Jira 的 {code} 轉換為 Markdown 的 ```
    markdown = markdown.replace(/\{code\}/g, '```');
    markdown = markdown.replace(/\{code:([^}]+)\}/g, '```$1');

    // 處理行內代碼 - Jira 的 {{text}} 轉換為 Markdown 的 `text`
    markdown = markdown.replace(/\{\{([^}]+)\}\}/g, '`$1`');

    // 處理無序列表 - Jira 的 * 轉換為 Markdown 的 -
    markdown = markdown.replace(/^\*\s+/gm, '- ');

    // 處理有序列表 - Jira 的 # 轉換為 Markdown 的 1.
    markdown = markdown.replace(/^#\s+/gm, '1. ');

    // 處理引用 - Jira 的 bq. 轉換為 Markdown 的 >
    markdown = markdown.replace(/^bq\.\s*(.+)$/gm, '> $1');

    // 處理連結 - Jira 的 [text|url] 轉換為 Markdown 的 [text](url)
    markdown = markdown.replace(/\[([^|\]]+)\|([^\]]+)\]/g, '[$1]($2)');

    // 處理圖片 - Jira 的 !url! 轉換為 Markdown 的 ![alt](url)
    markdown = markdown.replace(/!([^!]+)!/g, '![]($1)');

    // 清理多餘的換行
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    return markdown.trim();
  }

  /**
   * 建立 GitHub issue
   * @param owner 儲存庫擁有者
   * @param repo 儲存庫名稱
   * @param createIssueDto issue 資料
   * @returns 建立的 issue 資訊
   */
  async createIssue(
    owner: string,
    repo: string,
    createIssueDto: any,
  ): Promise<GitHubIssueResponseDto> {
    try {
      const url = `${this.githubApiUrl}/repos/${owner}/${repo}/issues`;
      const requestBody: {
        title: string;
        body?: string;
        assignees?: string[];
        labels?: string[];
        milestone?: string;
      } = {
        title: `[${createIssueDto.issue.key}] ${createIssueDto.issue.fields.summary}`,
      };

      // 只添加非空值
      // if (createIssueDto.body) {
      const markdownDescription = this.convertJiraToMarkdown(createIssueDto.issue.fields.description);
      requestBody.body = `## Ticket Link: [${createIssueDto.issue.key}](${createIssueDto.issue.self})\n\n${markdownDescription}\n\n @claude help me review the issue`;
      // }

      if (createIssueDto.assignees) {
        requestBody.assignees = createIssueDto.assignees.split(',');
      }

      if (createIssueDto.labels) {
        requestBody.labels = createIssueDto.labels.split(',');
      }

      if (createIssueDto.milestone) {
        requestBody.milestone = createIssueDto.milestone;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new HttpException(
          `GitHub API error: ${errorData.message || response.statusText}`,
          response.status,
        );
      }

      const issueData = (await response.json()) as GitHubIssueResponseDto;
      return issueData;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to create GitHub issue: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 取得 GitHub issue
   * @param owner 儲存庫擁有者
   * @param repo 儲存庫名稱
   * @param issueNumber issue 編號
   * @returns issue 資訊
   */
  async getIssue(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<GitHubIssueResponseDto> {
    try {
      const url = `${this.githubApiUrl}/repos/${owner}/${repo}/issues/${issueNumber}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new HttpException(
          `GitHub API error: ${errorData.message || response.statusText}`,
          response.status,
        );
      }

      const issueData = (await response.json()) as GitHubIssueResponseDto;
      return issueData;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to get GitHub issue: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 取得所有 GitHub issues
   * @param owner 儲存庫擁有者
   * @param repo 儲存庫名稱
   * @param options 查詢選項 (state, labels, sort, direction, per_page, page)
   * @returns issues 列表
   */
  async getAllIssues(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all';
      labels?: string;
      sort?: 'created' | 'updated' | 'comments';
      direction?: 'asc' | 'desc';
      per_page?: number;
      page?: number;
    },
  ): Promise<GitHubIssueResponseDto[]> {
    try {
      const url = new URL(`${this.githubApiUrl}/repos/${owner}/${repo}/issues`);

      // 添加查詢參數
      if (options) {
        if (options.state) url.searchParams.set('state', options.state);
        if (options.labels) url.searchParams.set('labels', options.labels);
        if (options.sort) url.searchParams.set('sort', options.sort);
        if (options.direction) url.searchParams.set('direction', options.direction);
        if (options.per_page) url.searchParams.set('per_page', options.per_page.toString());
        if (options.page) url.searchParams.set('page', options.page.toString());
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new HttpException(
          `GitHub API error: ${errorData.message || response.statusText}`,
          response.status,
        );
      }

      const issuesData = (await response.json()) as GitHubIssueResponseDto[];
      return issuesData;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to get GitHub issues: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
