import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-document-upload-warning',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule,
    MatIconModule, 
    MatButtonModule
  ],
  templateUrl: './document-upload-warning.component.html',
  styleUrl: './document-upload-warning.component.scss'
})
export class DocumentUploadWarningComponent {
  constructor(
    private dialogRef: MatDialogRef<DocumentUploadWarningComponent>
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onProceed(): void {
    this.dialogRef.close(true);
  }
}
