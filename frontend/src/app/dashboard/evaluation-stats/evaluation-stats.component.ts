// evaluation-stats.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BehaviorSubject } from 'rxjs';

interface CategoryStats {
  score: number;
  met: number;
  notMet: number;
  partiallyMet: number;
  total: number;
}

interface EvaluationStats {
  techEval?: CategoryStats;
  workProducts?: CategoryStats;
  reqResData?: CategoryStats;
  totalScore: number;
}

@Component({
  selector: 'app-evaluation-stats',
  templateUrl: './evaluation-stats.component.html',
  styleUrls: ['./evaluation-stats.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, 
    MatGridListModule, 
    MatProgressBarModule, 
    MatProgressSpinnerModule, 
    MatTooltipModule,
    MatDividerModule,
    MatIconModule
  ]
})
export class EvaluationStatsComponent implements OnInit, OnChanges {
  @Input() derivedRequirements?: any;
  @Input() workProducts?: any;
  @Input() reqResData?: any;

  private statsSubject = new BehaviorSubject<EvaluationStats>({ totalScore: 0 });
  stats$ = this.statsSubject.asObservable();

  ngOnInit() {
    this.updateStats();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.updateStats();
  }

  private calculateCategoryStats(items?: any[]): CategoryStats | undefined {
    if (!items || items.length === 0) return undefined;

    const total = items.length;
    const met = items.filter(item => item.answer === 'Met').length;
    const notMet = items.filter(item => item.answer === 'Not Met').length;
    const partiallyMet = items.filter(item => item.answer === 'Partially Met').length;
    const score = Math.round((met / total) * 100);

    return { score, met, notMet, partiallyMet, total };
  }

  private updateStats() {
    const techEval = this.calculateCategoryStats(this.derivedRequirements);
    const workProducts = this.calculateCategoryStats(this.workProducts);
    const reqResData = this.calculateCategoryStats(this.reqResData);

    // Calculate total score only from available categories
    const scores: number[] = [];
    if (techEval) scores.push(techEval.score);
    if (workProducts) scores.push(workProducts.score);
    if (reqResData) scores.push(reqResData.score);

    const totalScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
      : 0;

    this.statsSubject.next({
      techEval,
      workProducts,
      reqResData,
      totalScore
    });
  }
}