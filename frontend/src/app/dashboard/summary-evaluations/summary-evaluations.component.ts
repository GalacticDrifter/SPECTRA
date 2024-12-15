import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';

interface SummaryEvaluations {
  combined_summary: string;
  summary_derived_requirements_evaluation: string;
  summary_req_res_evaluation: string;
  summary_work_products_evaluation: string;
}

@Component({
  selector: 'app-summary-evaluations',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './summary-evaluations.component.html',
  styleUrl: './summary-evaluations.component.scss'
})
export class SummaryEvaluationsComponent {
  @Input() summaries!: SummaryEvaluations;

  formatMarkdown(text: string): string {
    if (!text) return '';

    // Convert markdown to HTML
    return text
      // Convert headers
      .replace(/#{4} (.*?)\n/g, '<h4>$1</h4>')
      .replace(/#{3} (.*?)\n/g, '<h3>$1</h3>')
      .replace(/#{2} (.*?)\n/g, '<h2>$1</h2>')
      .replace(/#{1} (.*?)\n/g, '<h1>$1</h1>')
      // Convert bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert bullet points
      .replace(/^ *- (.*?)$/gm, '<li>$1</li>')
      // Wrap lists in ul tags
      .replace(/(<li>.*?<\/li>)\n/g, '<ul>$1</ul>')
      // Convert line breaks
      .replace(/\n/g, '<br>');
  }
}