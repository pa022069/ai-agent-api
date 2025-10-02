import {
  Controller,
  Post,
  Body,
  Logger,
} from '@nestjs/common';
import {
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
    return await this.analyzeService.getAnalysisResult(analysisRequest);
  }

  @Post('ticket')
  async getAnalysisJiraTicket(@Body() analysisRequest: any) {
    return await this.analyzeService.getAnalysisJiraTicket(analysisRequest);
  }
}
