import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { Component } from "@angular/core";
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatInputModule } from "@angular/material/input";

@Component({
    selector: 'app-new-project-dialog',
    template: `
      <h2 mat-dialog-title class="new-project-dialog-title">Create New Project</h2>
      <mat-dialog-content>
        <form [formGroup]="projectForm" class="new-project-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Project Name</mat-label>
            <input matInput formControlName="name" required>
            <mat-error *ngIf="projectForm.get('name')?.hasError('required')">
              Project name is required
            </mat-error>
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary" 
                [disabled]="!projectForm.valid"
                (click)="onSubmit()">
          Create Project
        </button>
      </mat-dialog-actions>
    `,
    styles: [`
      .full-width {
        width: 100%;
      }
      .new-project-form {
        padding-top: 0.5rem;
      }
    `],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        HttpClientModule,
        MatInputModule,
        MatButtonModule,
        MatDialogModule
    ],
  })
  export class NewProjectDialogComponent {
    projectForm: FormGroup;
  
    constructor(
      private fb: FormBuilder,
      private dialogRef: MatDialogRef<NewProjectDialogComponent>
    ) {
      this.projectForm = this.fb.group({
        name: ['', Validators.required]
      });
    }
  
    onSubmit() {
      if (this.projectForm.valid) {
        this.dialogRef.close(this.projectForm.value.name);
      }
    }
  }