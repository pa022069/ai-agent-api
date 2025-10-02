import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GitHubController } from './github.controller';
import { GitHubService } from './github.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisRequest } from '../../entities/analysis-request.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([AnalysisRequest])],
  controllers: [GitHubController],
  providers: [GitHubService],
  exports: [GitHubService],
})
export class GitHubModule { }
