import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GitHubService } from './github.service';
// import { CreateIssueDto } from './dto/create-issue.dto';
import { GitHubIssueResponseDto } from './dto/github-issue-response.dto';

@Controller('github')
export class GitHubController {
  constructor(private readonly githubService: GitHubService) { }

  /**
   * 建立 GitHub issue
   * @param owner 儲存庫擁有者
   * @param repo 儲存庫名稱
   * @param createIssueDto issue 建立資料
   * @returns 建立的 issue 資訊
   */
  @Post('repos/:owner/:repo/issues')
  async createIssue(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() createIssueDto: any,
    // @Body() createIssueDto: CreateIssueDto,
  ): Promise<GitHubIssueResponseDto> {
    try {
      return await this.githubService.createIssue(owner, repo, createIssueDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to create issue: ${errorMessage}`,
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
  @Get('repos/:owner/:repo/issues/:issueNumber')
  async getIssue(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('issueNumber') issueNumber: string,
  ): Promise<GitHubIssueResponseDto> {
    try {
      const issueNum = parseInt(issueNumber, 10);
      if (isNaN(issueNum)) {
        throw new HttpException('Invalid issue number', HttpStatus.BAD_REQUEST);
      }

      return await this.githubService.getIssue(owner, repo, issueNum);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to get issue: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 測試端點
   * @returns 測試回應
   */
  @Get('test')
  test(): { message: string; timestamp: string } {
    return {
      message: 'GitHub module is working',
      timestamp: new Date().toISOString(),
    };
  }
}
