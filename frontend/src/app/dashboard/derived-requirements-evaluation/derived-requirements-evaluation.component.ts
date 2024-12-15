import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface DerivedRequirementsEvaluation {
  answer: 'Met' | 'Not Met' | 'Partially Met';
  id: number;
  justification: string;
  query: string;
}

@Component({
  selector: 'app-derived-requirements-evaluation',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule
  ],

  templateUrl: './derived-requirements-evaluation.component.html',
  styleUrl: './derived-requirements-evaluation.component.scss'
})
export class DerivedRequirementsEvaluationComponent {
  @Input() qaItems: DerivedRequirementsEvaluation[] = [];

  getMetCount(): number {
    return this.qaItems.filter(item => item.answer === 'Met').length;
  }

  getNotMetCount(): number {
    return this.qaItems.filter(item => item.answer === 'Not Met').length;
  }

  getPartiallyMetCount(): number {
    return this.qaItems.filter(item => item.answer === 'Partially Met').length;
  }

}
