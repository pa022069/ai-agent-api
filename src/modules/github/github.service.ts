import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateIssueDto } from './dto/create-issue.dto';
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
   * 建立 GitHub issue
   * @param owner 儲存庫擁有者
   * @param repo 儲存庫名稱
   * @param createIssueDto issue 資料
   * @returns 建立的 issue 資訊
   */
  async createIssue(
    owner: string,
    repo: string,
    createIssueDto: CreateIssueDto,
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
        title: createIssueDto.title,
      };

      // 只添加非空值
      if (createIssueDto.body) {
        requestBody.body = createIssueDto.body;
      }

      if (createIssueDto.assignees) {
        requestBody.assignees = createIssueDto.assignees.split(',');
      }

      if (createIssueDto.labels) {
        requestBody.labels = createIssueDto.labels.split(',');
      }

      if (createIssueDto.milestone) {
        requestBody.milestone = createIssueDto.milestone;
      }

      console.log(
        'requestBody to GitHub API:',
        JSON.stringify(requestBody, null, 2),
      );

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
}
