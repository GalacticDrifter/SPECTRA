import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MaterialService } from '../services/material.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-materials',
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
  templateUrl: './materials.component.html',
  styleUrl: './materials.component.scss'
})
export class MaterialsComponent implements OnInit, OnDestroy {
  @Input() parentForm!: FormGroup;

  // Form controls
  materialForm!: FormGroup;

  // Table configuration
  displayedColumns =  ['fiscalYear', 'materialType', 'proposedQty', 'recommendedQty', 'pageRef', 'actions'];
  dataSource!: MatTableDataSource<AbstractControl>;

  // UI state
  isLoading = false;
  showErrors = false;
  formErrors: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(private materialService: MaterialService) {}

  ngOnInit() {
    this.initializeForm();
    this.setupSubscriptions();
    // this.setupValidation();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Form initialization
  private initializeForm() {
    this.materialForm = this.materialService.createMaterialForm();
    // this.dataSource = new MatTableDataSource(this.laborHoursArray.controls);
    this.addToParentForm();
  }

  private addToParentForm() {
    if (this.parentForm) {
      this.parentForm.addControl('materialSection', this.materialForm);
    }
  }

  // Form state management
  private setupSubscriptions() {
    // Subscribe to form value changes
    this.materialForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (this.parentForm) {
          this.parentForm.get('materialSection')?.patchValue(value, { emitEvent: false });
        }
        this.validateForm();
      });

    // Subscribe to service state changes
    this.materialService.formState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: any) => {
        if (state) {
          this.handleFormState(state);
        }
      });
  }

  // Validation
  private validateForm() {
    this.formErrors = [];
    this.showErrors = false;

    if (!this.materialForm.valid) {
      // this.collectFormErrors(this.materialForm);
      this.showErrors = this.formErrors.length > 0;
    }
  }

  private handleFormState(state: any) {
    this.isLoading = state.isLoading ?? this.isLoading;
    // Handle other state changes as needed
  }


}
