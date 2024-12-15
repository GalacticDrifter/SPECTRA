import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SummaryEvaluationsComponent } from '../dashboard/summary-evaluations/summary-evaluations.component';
import { DataStore } from '../services/datastore.service';
import { EvaluationStatsComponent } from '../dashboard/evaluation-stats/evaluation-stats.component';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, SummaryEvaluationsComponent, EvaluationStatsComponent],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss'
})
export class ReportComponent {

  constructor(public store: DataStore) { }
}
