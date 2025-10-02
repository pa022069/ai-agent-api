import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AnalysisResultFromClaudeDto } from '../modules/analyze/dto/analysis-request.dto';

@Entity('analysis_requests')
export class AnalysisRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  requestId: string;

  @Column()
  jiraTicketKey: string;

  @Column('json')
  jiraTicketContext: {
    key: string;
    summary: string;
    description: string;
    self: string;
    assignees: string;
    labels: string;
  };

  @Column('json')
  analysisResults: AnalysisResultFromClaudeDto[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  status: boolean;
}
