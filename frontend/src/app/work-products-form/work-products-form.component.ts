import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

import { DataStore } from '../services/datastore.service';


@Component({
  selector: 'app-work-products-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatListModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  templateUrl: './work-products-form.component.html',
  styleUrl: './work-products-form.component.scss'
})
export class WorkProductsFormComponent {
  form!: FormGroup;
  workProductsEvaluation$: Observable<any[] | null>;
  origData: any[] = [];

  constructor(private fb: FormBuilder, private snackBar: MatSnackBar, private store: DataStore) {
    this.workProductsEvaluation$ = this.store.workProductsEvaluation$;
  }

  ngOnInit(): void {
    this.workProductsEvaluation$.subscribe((data: any[] | null) => {
      if (data) {
        // console.log('Work products:', data);
        this.origData = data;
        this.form = this.fb.group({
          justifications: this.fb.array(data.map((f: any) => this.fb.control(f.justification, Validators.required)))
        });
      }
    });
  }

  get justifications(): FormArray {
    return this.form.get('justifications') as FormArray;
  }

  getPreviousSection(index: number, items: any[]): string {
    if (index === 0) return '';
    return items[index - 1].section;
  }

  submitForm(): void {
    if (this.form.valid) {
      const formData = this.form.value.justifications;
      console.log('formData:', formData);
      const updatedWorkProducts = (this.store.workProductsEvaluation || []).map((item: any, index: number) => ({
          ...item,
          justification: formData[index]
        }));
      console.log('Form submission:', updatedWorkProducts);

      this.store.submitWorkProductsForm(updatedWorkProducts).subscribe({
        next: () => {
          this.showNotification('Work products form saved!');
          this.form.reset();
        },
        error: (error) => {
          console.error('Error:', error);
          this.showNotification('An error occurred. Please try again.');
        }
      });
    } else {
      console.log('Form is invalid. Please fill out all required fields.');
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
