import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { GitHubService } from './github.service';
// import { CreateIssueDto } from './dto/create-issue.dto';
import { GitHubIssueResponseDto } from './dto/github-issue-response.dto';

@ApiTags('github')
@Controller('github')
export class GitHubController {
  private readonly logger = new Logger(GitHubController.name);
  constructor(private readonly githubService: GitHubService) { }

  /**
   * 建立 GitHub issue
   * @param owner 儲存庫擁有者
   * @param repo 儲存庫名稱
   * @param createIssueDto issue 建立資料
   * @returns 建立的 issue 資訊
   */
  @Post('repos/:owner/:repo/issues')
  @ApiOperation({
    summary: '建立 GitHub issue',
    description: '在指定的 GitHub 儲存庫中建立新的 issue',
  })
  @ApiParam({
    name: 'owner',
    description: '儲存庫擁有者',
    example: 'octocat',
  })
  @ApiParam({
    name: 'repo',
    description: '儲存庫名稱',
    example: 'Hello-World',
  })
  @ApiBody({
    description: 'Issue 建立資料',
    schema: {
      type: 'object',
      properties: {
        issue: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Issue 編號',
              example: 'PROJ-123',
            },
            fields: {
              type: 'object',
              properties: {
                summary: {
                  type: 'string',
                  description: 'Issue 標題',
                  example: '修復登入問題',
                },
                description: {
                  type: 'string',
                  description: 'Issue 描述',
                  example: '用戶無法正常登入系統',
                },
              },
            },
            self: {
              type: 'string',
              description: 'Issue 連結',
              example: 'https://company.atlassian.net/browse/PROJ-123',
            },
          },
        },
        assignees: {
          type: 'string',
          description: '指派人員（逗號分隔）',
          example: 'user1,user2',
        },
        labels: {
          type: 'string',
          description: '標籤（逗號分隔）',
          example: 'bug,urgent',
        },
        milestone: {
          type: 'string',
          description: '里程碑',
          example: '1',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Issue 建立成功',
    type: () => GitHubIssueResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '請求參數錯誤',
  })
  @ApiResponse({
    status: 401,
    description: 'GitHub token 無效',
  })
  @ApiResponse({
    status: 404,
    description: '儲存庫不存在',
  })
  @ApiResponse({
    status: 500,
    description: '伺服器內部錯誤',
  })
  async createIssue(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() createIssueDto: any,
    // @Body() createIssueDto: CreateIssueDto,
  ): Promise<GitHubIssueResponseDto> {
    this.logger.log('[Info] create github-issue: ', JSON.stringify({
      owner,
      repo,
    }, null, 2));
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
   * 根據 URL 取得 GitHub issue 內容
   * @param issueUrl GitHub issue URL
   * @returns issue 內容
   */
  @Get('issues')
  @ApiOperation({
    summary: '取得 GitHub issue',
    description: '根據 issue URL 取得 GitHub issue 的詳細內容',
  })
  @ApiQuery({
    name: 'url',
    description: 'GitHub issue URL',
    example: 'https://github.com/Positive-LLC/ai-agent-dev/issues/43',
  })
  @ApiResponse({
    status: 200,
    description: '成功取得 issue 內容',
    type: () => GitHubIssueResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Issue 不存在',
  })
  @ApiResponse({
    status: 500,
    description: '伺服器內部錯誤',
  })
  async getIssue(@Query('url') url: string): Promise<GitHubIssueResponseDto> {
    if (!url) {
      throw new HttpException(
        'URL parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`[Info] Getting GitHub issue: ${url}`);
    try {
      return await this.githubService.getIssueByUrl(url);
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
}
