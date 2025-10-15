import {
  Controller,
  Post,
  Body,
  Logger,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyzeService } from './analyze.service';
import { AnalysisResultFromClaudeDto } from './dto/analysis-request.dto';

@ApiTags('analyze')
@Controller('analyze')
export class AnalyzeController {
  private readonly logger = new Logger(AnalyzeController.name);

  constructor(private readonly analyzeService: AnalyzeService) { }

  @Post('result')
  async getAnalysisResult(@Body() analysisRequest: AnalysisResultFromClaudeDto) {
    this.logger.log(`[Info] 開始分析結果: ${JSON.stringify(analysisRequest)}`);
    return await this.analyzeService.getAnalysisResult(analysisRequest);
  }

  @Post('ticket')
  @ApiOperation({ summary: '分析 Jira Ticket' })
  async getAnalysisJiraTicket(@Body() analysisRequest: any) {
    this.logger.log(`[Info] 開始分析 Jira Ticket: ${JSON.stringify(analysisRequest)}`);
    return await this.analyzeService.getAnalysisJiraTicket(analysisRequest);
  }
}
