// components/general-information.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GeneralInformationService } from '../services/general-information.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';

@Component({
  selector: 'app-general-information',
  templateUrl: './general-information.component.html',
  styleUrl: './general-information.component.scss',
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
    MatProgressSpinnerModule,
    MatDatepickerModule
  ],
  providers: [provideNativeDateAdapter()]
})
export class GeneralInformationComponent implements OnInit, OnDestroy {
  @Input() parentForm!: FormGroup;
  
  generalInfoForm!: FormGroup;
  isLoading = false;
  showErrors = false;
  formErrors: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(private generalInfoService: GeneralInformationService) {}

  ngOnInit() {
    this.initForm();
    this.setupFormSubscriptions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm() {
    try {
      this.generalInfoForm = this.generalInfoService.createForm();
      this.addToParentForm();
    } catch (error) {
      console.error('Error initializing form:', error);
      // Handle form initialization error
    }
  }

  private setupFormSubscriptions() {
    // Subscribe to form value changes
    this.generalInfoForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        try {
          if (this.parentForm) {
            this.parentForm.get('generalInformation')?.patchValue(value, { emitEvent: false });
          }
          this.validateForm();
        } catch (error) {
          console.error('Error updating form:', error);
          // Handle form update error
        }
      });

    // Subscribe to form state from service
    this.generalInfoService.formState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        if (state) {
          this.handleFormState(state);
        }
      });
  }

  private validateForm() {
    this.formErrors = [];
    this.showErrors = false;

    if (!this.generalInfoForm.valid) {
      this.collectFormErrors(this.generalInfoForm);
      this.showErrors = this.formErrors.length > 0;
    }
  }

  private collectFormErrors(form: FormGroup, parentPath: string = '') {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      const path = parentPath ? `${parentPath}.${key}` : key;

      if (control instanceof FormGroup) {
        this.collectFormErrors(control, path);
      } else if (control?.errors && control.touched) {
        Object.keys(control.errors).forEach(errorKey => {
          const errorMsg = this.generalInfoService.getErrorMessage(control);
          if (errorMsg) {
            this.formErrors.push(`${this.getFieldLabel(path)}: ${errorMsg}`);
          }
        });
      }
    });
  }

  private getFieldLabel(path: string): string {
    // Map form control paths to user-friendly labels
    const labelMap: { [key: string]: string } = {
      'programTitle': 'Program Title',
      'contractsPOC.name': 'POC Name',
      'contractsPOC.code': 'POC Code',
      // ... add other field mappings
    };
    return labelMap[path] || path;
  }

  private addToParentForm() {
    if (this.parentForm) {
      this.parentForm.addControl('generalInformation', this.generalInfoForm);
    }
  }

  private handleFormState(state: any) {
    if (state.isLoading !== undefined) {
      this.isLoading = state.isLoading;
    }
    // Handle other state changes as needed
  }
}