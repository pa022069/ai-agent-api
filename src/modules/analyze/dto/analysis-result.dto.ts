import { ApiProperty } from '@nestjs/swagger';

export class RepositoryAnalysisResult {
  @ApiProperty({
    description: '儲存庫擁有者',
    example: 'octocat',
  })
  owner: string;

  @ApiProperty({
    description: '儲存庫名稱',
    example: 'Hello-World',
  })
  repo: string;

  @ApiProperty({
    description: '分析評分（0-100分）',
    example: 85,
  })
  score: number;

  @ApiProperty({
    description: '分析結果詳細說明',
    example: '此儲存庫適合實作登入功能，已有相關基礎架構',
  })
  analysis: string;

  @ApiProperty({
    description: '建立的 analyze issue 編號',
    example: 123,
  })
  analyzeIssueNumber: number;

  @ApiProperty({
    description: '建立的 analyze issue URL',
    example: 'https://github.com/octocat/Hello-World/issues/123',
  })
  analyzeIssueUrl: string;
}

export class AnalysisResultDto {
  @ApiProperty({
    description: '分析請求 ID',
    example: 'req_123456789',
  })
  requestId: string;

  @ApiProperty({
    description: 'Jira Ticket 編號',
    example: 'PROJ-123',
  })
  jiraTicketKey: string;

  @ApiProperty({
    description: '各儲存庫分析結果',
    type: [RepositoryAnalysisResult],
  })
  repositoryResults: RepositoryAnalysisResult[];

  @ApiProperty({
    description: '最高評分的儲存庫',
    example: {
      owner: 'octocat',
      repo: 'Hello-World',
      score: 85,
    },
  })
  bestMatch: {
    owner: string;
    repo: string;
    score: number;
  };

  @ApiProperty({
    description: '最終建立的 issue 編號（在最佳匹配的儲存庫中）',
    example: 124,
  })
  finalIssueNumber: number;

  @ApiProperty({
    description: '最終建立的 issue URL',
    example: 'https://github.com/octocat/Hello-World/issues/124',
  })
  finalIssueUrl: string;

  @ApiProperty({
    description: '分析狀態',
    example: 'completed',
    enum: ['processing', 'completed', 'failed'],
  })
  status: 'processing' | 'completed' | 'failed';

  @ApiProperty({
    description: '錯誤訊息（如果分析失敗）',
    required: false,
    example: '無法連接到 GitHub API',
  })
  error?: string;
}
