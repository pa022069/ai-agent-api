import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnalyzeController } from './analyze.controller';
import { AnalyzeService } from './analyze.service';
import { OpenRouterService } from './services/openrouter.service';
import { GitHubModule } from '../github/github.module';
import { AnalysisRequest } from '../../entities/analysis-request.entity';
import { AnalysisCollectorAgent } from './agents/analysis-collector.agent';
import { RelevanceEvaluationAgent } from './agents/relevance-evaluation.agent';
import { DecisionExecutorAgent } from './agents/decision-executor.agent';

@Module({
  imports: [
    GitHubModule,
    TypeOrmModule.forFeature([AnalysisRequest]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [AnalyzeController],
  providers: [
    AnalysisCollectorAgent,
    RelevanceEvaluationAgent,
    DecisionExecutorAgent,
    AnalyzeService,
    OpenRouterService,
  ],
  exports: [AnalyzeService],
})
export class AnalyzeModule { }
