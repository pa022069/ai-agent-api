import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RepositoryConfig {
  @ApiProperty({
    description: '儲存庫擁有者',
    example: 'octocat',
  })
  @IsString()
  @IsNotEmpty()
  owner: string;

  @ApiProperty({
    description: '儲存庫名稱',
    example: 'Hello-World',
  })
  @IsString()
  @IsNotEmpty()
  repo: string;

  @ApiProperty({
    description: 'Claude Code 分析提示詞',
    example: '請分析這個需求並給出評分（0-100分）',
  })
  @IsString()
  @IsNotEmpty()
  analysisPrompt: string;
}

export class AnalysisResultFromClaudeDto {
  @ApiProperty({
    description: '分析結果',
    example: '此儲存庫適合實作登入功能，已有相關基礎架構',
  })
  @IsString()
  @IsNotEmpty()
  result: string;

  @ApiProperty({
    description: '儲存庫名稱',
    example: 'octocat/Hello-World',
  })
  @IsString()
  @IsNotEmpty()
  repository: string;

  @ApiProperty({
    description: 'Issue 編號',
    example: 123,
  })
  @IsNotEmpty()
  issue_number: number | string;

  @ApiProperty({
    description: 'Issue URL',
    example: 'https://github.com/octocat/Hello-World/issues/123',
  })
  @IsString()
  @IsOptional()
  issue_url: string;
}

export class ExtractedAnalysisResultDto {
  @ApiProperty({
    description: '儲存庫名稱',
    example: 'octocat/Hello-World',
  })
  @IsString()
  @IsNotEmpty()
  repository: string;

  @ApiProperty({
    description: 'Issue 編號',
    example: 123,
  })
  @IsNotEmpty()
  issue_number: number | string;

  @ApiProperty({
    description: '相關性評分',
    example: '95',
  })
  @IsString()
  relevanceScore: string;

  @ApiProperty({
    description: '相關文件列表',
    example: ['.github/workflows/claude.yml', 'markdown-to-json.js'],
    type: [String],
  })
  @IsArray()
  relatedFiles: string[];

  @ApiProperty({
    description: 'Issue URL',
    example: 'https://github.com/octocat/Hello-World/issues/123',
  })
  @IsString()
  @IsNotEmpty()
  issue_url: string;
}

export class AnalysisRequestDto {
  @ApiProperty({
    description: 'Jira 需求描述',
    example: '需要實作用戶登入功能，包含帳號密碼驗證和記住登入狀態',
  })
  @IsString()
  @IsNotEmpty()
  requirement: string;

  @ApiProperty({
    description: 'Jira Ticket 資訊',
    example: {
      key: 'PROJ-123',
      summary: '實作用戶登入功能',
      description: '需要實作用戶登入功能，包含帳號密碼驗證和記住登入狀態',
      self: 'https://company.atlassian.net/browse/PROJ-123',
    },
  })
  @IsNotEmpty()
  jiraTicket: {
    key: string;
    summary: string;
    description: string;
    self: string;
  };

  @ApiProperty({
    description: '要分析的儲存庫列表',
    type: [RepositoryConfig],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepositoryConfig)
  repositories: RepositoryConfig[];

  @ApiProperty({
    description: '指派人員（逗號分隔）',
    required: false,
    example: 'user1,user2',
  })
  @IsOptional()
  @IsString()
  assignees?: string;

  @ApiProperty({
    description: '標籤（逗號分隔）',
    required: false,
    example: 'feature,analysis',
  })
  @IsOptional()
  @IsString()
  labels?: string;

  @ApiProperty({
    description: '里程碑',
    required: false,
    example: '1',
  })
  @IsOptional()
  @IsString()
  milestone?: string;
}
