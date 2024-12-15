import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { NewProjectDialogComponent } from './new-project-dialog.component';
import { MatListModule } from '@angular/material/list';
import { SafePipe } from './safe.pipe';
import { MatExpansionModule } from '@angular/material/expansion';
import { Observable } from 'rxjs';
import { DataStore, ProjectData } from '../services/datastore.service';
import { Router } from '@angular/router';
import { SummaryEvaluationsComponent } from './summary-evaluations/summary-evaluations.component';
import { DerivedRequirementsEvaluationComponent } from './derived-requirements-evaluation/derived-requirements-evaluation.component';
import { EvaluationStatsComponent } from './evaluation-stats/evaluation-stats.component';
import { DocumentUploadWarningComponent } from './document-upload-warning/document-upload-warning.component';
import { ProgressTrackerComponent } from '../progress-tracker/progress-tracker.component';


interface Project {
  id: string;
  name: string;
  created_date: string;
}

interface EvaluationStats {
  techEvalScore: number;
  workProductScore: number;
  requirementsScore: number;
  totalScore: number;
}

interface DerivedRequirementsEvaluation {
  answer: 'Met' | 'Not Met' | 'Partially Met';
  id: number;
  justification: string;
  query: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTabsModule ,
    MatDividerModule,
    MatListModule,
    MatDialogModule,
    MatChipsModule,
    MatSelectModule,
    MatExpansionModule,
    NewProjectDialogComponent,
    SummaryEvaluationsComponent,
    DerivedRequirementsEvaluationComponent,
    EvaluationStatsComponent,
    DocumentUploadWarningComponent,
    SafePipe,
    ProgressTrackerComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
    projects$: Observable<Project[]>;
    projectData$: Observable<ProjectData | null>;
    selectedProject$: Observable<Project | null>;
    isProcessing$: Observable<boolean>;
    canDeriveRequirements$: Observable<boolean>;
    hasRequirements$: Observable<boolean>;
    derivedRequirementsEvaluation$: Observable<DerivedRequirementsEvaluation[] | null>;
    workProductsEvaluation$: Observable<any[] | null>;
    requestResponseEvaluation$: Observable<any[] | null>;
    summaries$: Observable<any>;
    stats$: Observable<EvaluationStats>;
    uploadForm: FormGroup;
    resetProgressFlag = false;

    constructor(
      private fb: FormBuilder,
      private snackBar: MatSnackBar,
      private dialog: MatDialog,
      private store: DataStore,
      private router: Router
    ) {
      this.uploadForm = this.fb.group({
        request: [''],
        response: ['']
      });

      // Initialize observables
      this.projects$ = this.store.projects$;
      this.projectData$ = this.store.projectData$;
      this.selectedProject$ = this.store.selectedProject$;
      this.isProcessing$ = this.store.loading$;
      this.canDeriveRequirements$ = this.store.canDeriveRequirements$;
      this.hasRequirements$ = this.store.hasRequirements$;
      this.derivedRequirementsEvaluation$ = this.store.derivedRequirementsEvaluation$;
      this.workProductsEvaluation$ = this.store.workProductsEvaluation$;
      this.requestResponseEvaluation$ = this.store.requestResponseEvaluation$;
      this.summaries$ = this.store.summaries$;
      this.stats$ = this.store.evaluationStats$;
    }

    ngOnInit() {
      this.store.loadProjects();
    }

    // Add this method to start any evaluation process
  private startEvaluation(evaluationFn: () => Observable<any>, successMessage: string, routeTo?: string): void {
    const projectId = this.store.selectedProject?.id;
    if (!projectId) {
      this.showNotification('No project selected');
      return;
    }

    // Reset the progress tracker before starting new operation
    this.resetProgressFlag = true;
    // Reset the flag after a brief delay to allow for future resets
    setTimeout(() => this.resetProgressFlag = false, 100);

    evaluationFn().subscribe({
      next: () => {
        this.showNotification(successMessage);
        if (routeTo) {
          setTimeout(() => this.router.navigate([routeTo]), 750);
        }
      },
      error: (error) => this.showNotification(error.message || 'Evaluation failed')
    });
  }

  // Update your evaluation methods to use the new startEvaluation method
  deriveAndEvaluateRequirements() {
    this.startEvaluation(
      () => this.store.deriveAndEvaluateRequirements(),
      'Requirements evaluated successfully'
    );
  }

  evaluateWorkProducts() {
    this.startEvaluation(
      () => this.store.evaluateWorkProducts(),
      'Work products evaluated successfully',
      '/work-products-form'
    );
  }

  evaluateRequirementsResponse() {
    this.startEvaluation(
      () => this.store.evaluateRequirementsResponse(),
      'Requirements response evaluated successfully',
      '/request-response-form'
    );
  }

  evaluationSummary() {
    this.startEvaluation(
      () => this.store.evaluationSummary(),
      'Evaluation summary generated successfully',
      '/report'
    );
  }

    openNewProjectDialog() {
      const dialogRef = this.dialog.open(NewProjectDialogComponent, {
        width: '400px'
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.store.createProject(result).subscribe({
            next: () => this.showNotification('Project created successfully'),
            error: () => this.showNotification('Error creating project')
          });
        }
      });
    }

    onProjectChange(project: Project | null) {
      this.store.selectProject(project);
    }

    onFileSelected(event: any, type: 'request' | 'response') {
      const file = event.target.files[0];
      if (file) {
        this.store.uploadFile(file, type).subscribe({
          next: () => this.showNotification('File uploaded successfully'),
          error: () => this.showNotification('Error uploading file')
        });
      }
    }

    /*
    deriveAndEvaluateRequirements() {
        this.store.deriveAndEvaluateRequirements().subscribe({
          next: () => {
            this.showNotification('Requirements evaluated successfully')
          },
          error: () => this.showNotification('Error deriving requirements')
        });
    }

    evaluateWorkProducts() {
      this.store.evaluateWorkProducts().subscribe({
        next: () => {
          this.showNotification('Work products evaluated successfully')
          this.router.navigate(['/work-products-form']);
        },
        error: () => this.showNotification('Error evaluating work products')
      });
    }

    evaluateRequirementsResponse() {
      this.store.evaluateRequirementsResponse().subscribe({
        next: () => {
          this.showNotification('Requirements response evaluated successfully')
          this.router.navigate(['/request-response-form']);
      },
        error: () => this.showNotification('Error evaluating requirements response')
      });
    }

    evaluationSummary() {
      this.store.evaluationSummary().subscribe({
        next: () => {
          this.showNotification('Evaluation summary generated successfully')
        },
        error: () => this.showNotification('Error generating evaluation summary')
      });
    }
    */

    clearGeneratedProjectData(event: any, type: 'request' | 'response') {
      this.store.clearGeneratedProjectData().subscribe({
        next: () => {
          this.onFileSelected(event, type);
          this.showNotification('Generated project data cleared successfully')
          },
        error: () => this.showNotification('Error clearing generated project data')
      });
    }

    openUpload(event: any, type: 'request' | 'response'): void {
      if ((type === 'request' && this.store.hasRequestDocument)
        || (type === 'response' && this.store.hasResponseDocument)) {

      const dialogRef = this.dialog.open(DocumentUploadWarningComponent, {
        width: '500px',
        disableClose: true // Prevents closing by clicking outside
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // User clicked "Proceed Anyway"
          // Handle the document upload here
          this.clearGeneratedProjectData(event, type);
        } else {
          // User clicked "Cancel Upload" or closed the dialog
          // Handle cancellation here
        }
      });

    } else {
        this.onFileSelected(event, type);
      }
    }

    private showNotification(message: string) {
      this.snackBar.open(message, 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }
