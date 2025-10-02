import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyzeController } from './analyze.controller';
import { AnalyzeService } from './analyze.service';
import { GitHubModule } from '../github/github.module';
import { AnalysisRequest } from '../../entities/analysis-request.entity';

@Module({
  imports: [
    GitHubModule,
    TypeOrmModule.forFeature([AnalysisRequest]),
  ],
  controllers: [AnalyzeController],
  providers: [AnalyzeService],
  exports: [AnalyzeService],
})
export class AnalyzeModule { }
