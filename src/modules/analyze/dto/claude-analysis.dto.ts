import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TeamMatchDto {
  @ApiProperty({
    description: '團隊名稱',
    example: 'Desktop Team',
  })
  @IsString()
  @IsNotEmpty()
  team: string;

  @ApiProperty({
    description: '儲存庫擁有者',
    example: 'Positive-LLC',
  })
  @IsString()
  @IsNotEmpty()
  owner: string;

  @ApiProperty({
    description: '儲存庫名稱',
    example: 'ai-agent-dev',
  })
  @IsString()
  @IsNotEmpty()
  repo: string;

  @ApiProperty({
    description: '匹配分數 (0-100)',
    example: 85,
  })
  @IsNumber()
  score: number;

  @ApiProperty({
    description: '信心度 (0-1)',
    example: 0.9,
  })
  @IsNumber()
  confidence: number;

  @ApiProperty({
    description: '匹配推理過程',
    example: '這個需求涉及桌面應用開發，Desktop Team 最適合...',
  })
  @IsString()
  @IsNotEmpty()
  reasoning: string;
}

export class TeamRepoDto {
  @ApiProperty({
    description: '儲存庫擁有者',
    example: 'Positive-LLC',
  })
  @IsString()
  @IsNotEmpty()
  owner: string;

  @ApiProperty({
    description: '儲存庫名稱',
    example: 'ai-agent-dev',
  })
  @IsString()
  @IsNotEmpty()
  repo: string;

  @ApiProperty({
    description: '優先級',
    example: 1,
  })
  @IsNumber()
  priority: number;

  @ApiProperty({
    description: '匹配分數',
    example: 85,
  })
  @IsNumber()
  score: number;

  @ApiProperty({
    description: '匹配理由',
    example: '主要匹配理由...',
  })
  @IsString()
  @IsNotEmpty()
  reasoning: string;
}

export class ClaudeTeamAnalysisResultDto {
  @ApiProperty({
    description: '最佳匹配團隊',
    type: TeamMatchDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TeamMatchDto)
  bestMatch?: TeamMatchDto | null;

  @ApiProperty({
    description: '所有團隊儲存庫列表',
    type: [TeamRepoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamRepoDto)
  allTeamRepos: TeamRepoDto[];
}

export class ClaudeAnalysisRequestDto {
  @ApiProperty({
    description: 'Jira ticket 標題',
    example: '實作用戶登入功能',
  })
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiProperty({
    description: 'Jira ticket 描述',
    example: '需要實作用戶登入功能，包含帳號密碼驗證和記住登入狀態',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: '團隊配置信息',
    type: 'array',
  })
  teamMapping: any[];
}
