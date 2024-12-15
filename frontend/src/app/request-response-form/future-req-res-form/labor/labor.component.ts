import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormArray, AbstractControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LaborService } from '../services/labor.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { LaborHourDetail, AcceptanceBasis } from '../interfaces/labor.interface';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-labor',
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
    MatExpansionModule,
    MatRadioModule,
    MatSelectModule,
    MatFormFieldModule,
    MatOptionModule,
    MatTableModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './labor.component.html',
  styleUrl: './labor.component.scss'
})
export class LaborComponent implements OnInit, OnDestroy {
  @Input() parentForm!: FormGroup;

  // Form controls
  laborForm!: FormGroup;
  
  // Table configuration
  displayedColumns = ['fiscalYear', 'laborCategory', 'proposedHours', 'recommendedHours', 'actions'];
  dataSource!: MatTableDataSource<AbstractControl>;

  // UI state
  isLoading = false;
  showErrors = false;
  formErrors: string[] = [];

  // Available options for dropdowns
  acceptanceBasisOptions = [
    { value: 'sameOrSimilar', label: 'Same or Similar Effort' },
    { value: 'estimatingMethod', label: 'Estimating Method/Software Model' },
    { value: 'expertise', label: 'Subject Matter Expertise' }
  ];

  private destroy$ = new Subject<void>();

  constructor(private laborService: LaborService) {}

  ngOnInit() {
    this.initializeForm();
    this.setupSubscriptions();
    this.setupValidation();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Form initialization
  private initializeForm() {
    this.laborForm = this.laborService.createLaborForm();
    this.dataSource = new MatTableDataSource(this.laborHoursArray.controls);
    this.addToParentForm();
  }

  private addToParentForm() {
    if (this.parentForm) {
      this.parentForm.addControl('laborSection', this.laborForm);
    }
  }

  // Form array getters
  get laborHoursArray(): FormArray {
    return this.laborForm.get('laborHours') as FormArray;
  }

  // Table operations
  addLaborHourRow(data?: Partial<LaborHourDetail>) {
    this.laborService.createLaborHourRow(data);
    this.updateDataSource();
    this.validateTotals();
  }

  removeLaborHourRow(index: number) {
    this.laborService.removeLaborHourRow(this.laborForm, index);
    this.updateDataSource();
    this.validateTotals();
  }

  private updateDataSource() {
    this.dataSource.data = this.laborHoursArray.controls;
  }

  // Validation
  private setupValidation() {
    this.laborService.setupAcceptanceBasisValidation(this.laborForm);
    
    // Watch for acceptability changes
    this.laborForm.get('laborTechnicallyAcceptable')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAcceptable => {
        this.handleAcceptabilityChange(isAcceptable);
      });

    // Watch for basis type changes
    this.laborForm.get('acceptanceBasis.type')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        this.handleBasisTypeChange(type);
      });
  }

  validateTotals() {
    const proposedTotal = this.calculateTotalHours('proposedHours');
    const recommendedTotal = this.calculateTotalHours('recommendedHours');
    
    if (!this.laborService.validateLaborHours(proposedTotal, recommendedTotal)) {
      this.formErrors.push('Recommended hours cannot exceed proposed hours');
      this.showErrors = true;
    } else {
      this.showErrors = false;
      this.formErrors = [];
    }
  }

  private calculateTotalHours(field: 'proposedHours' | 'recommendedHours'): number {
    return this.laborHoursArray.controls.reduce((total, control) => {
      const hours = Number(control.get(field)?.value) || 0;
      return total + hours;
    }, 0);
  }

  // Event handlers
  private handleAcceptabilityChange(isAcceptable: boolean) {
    if (isAcceptable) {
      this.laborHoursArray.clear();
      this.updateDataSource();
    }
    this.validateForm();
  }

  private handleBasisTypeChange(type: string) {
    const acceptanceBasis = this.laborForm.get('acceptanceBasis') as FormGroup;
    this.clearBasisFields(acceptanceBasis);
    this.setRequiredFields(type, acceptanceBasis);
  }

  private clearBasisFields(group: FormGroup) {
    ['contractNumber', 'methodology', 'credentials'].forEach(field => {
      const control = group.get(field);
      if (control) {
        control.clearValidators();
        control.updateValueAndValidity();
      }
    });
  }

  private setRequiredFields(type: string, group: FormGroup) {
    const fieldMap: { [key: string]: string } = {
      'sameOrSimilar': 'contractNumber',
      'estimatingMethod': 'methodology',
      'expertise': 'credentials'
    };

    const requiredField = fieldMap[type];
    if (requiredField) {
      const control = group.get(requiredField);
      if (control) {
        control.setValidators([Validators.required]);
        control.updateValueAndValidity();
      }
    }
  }

  // Form state management
  private setupSubscriptions() {
    // Subscribe to form value changes
    this.laborForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (this.parentForm) {
          this.parentForm.get('laborSection')?.patchValue(value, { emitEvent: false });
        }
        this.validateForm();
      });

    // Subscribe to service state changes
    this.laborService.formState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: any) => {
        if (state) {
          this.handleFormState(state);
        }
      });
  }

  private handleFormState(state: any) {
    this.isLoading = state.isLoading ?? this.isLoading;
    // Handle other state changes as needed
  }

  // Validation
  private validateForm() {
    this.formErrors = [];
    this.showErrors = false;

    if (!this.laborForm.valid) {
      this.collectFormErrors(this.laborForm);
      this.showErrors = this.formErrors.length > 0;
    }
  }

  private collectFormErrors(form: FormGroup, parentPath: string = '') {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      const path = parentPath ? `${parentPath}.${key}` : key;

      if (control instanceof FormGroup) {
        this.collectFormErrors(control, path);
      } else if (control instanceof FormArray) {
        control.controls.forEach((arrayControl, index) => {
          if (arrayControl instanceof FormGroup) {
            this.collectFormErrors(arrayControl, `${path}[${index}]`);
          }
        });
      } else if (control?.errors && control.touched) {
        Object.keys(control.errors).forEach(errorKey => {
          const errorMsg = this.laborService.getErrorMessage(control);
          if (errorMsg) {
            this.formErrors.push(`${this.getFieldLabel(path)}: ${errorMsg}`);
          }
        });
      }
    });
  }

  private getFieldLabel(path: string): string {
    const labelMap: { [key: string]: string } = {
      'proposedHours': 'Proposed Hours',
      'recommendedHours': 'Recommended Hours',
      'laborCategory': 'Labor Category',
      'fiscalYear': 'Fiscal Year'
      // Add more mappings as needed
    };
    return labelMap[path] || path;
  }

  // Public API for parent component
  reset() {
    this.laborForm.reset();
    this.laborHoursArray.clear();
    this.updateDataSource();
  }

  markAsTouched() {
    Object.values(this.laborForm.controls).forEach(control => {
      if (control instanceof FormGroup) {
        Object.values(control.controls).forEach(c => c.markAsTouched());
      } else {
        control.markAsTouched();
      }
    });
  }
}