// services/labor.service.ts
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';
import { BaseFormService } from './base-form.service';
import { LaborHourDetail, AcceptanceBasis, LaborSectionForm } from '../interfaces/labor.interface';

@Injectable({
  providedIn: 'root'
})
export class LaborService extends BaseFormService {
  setupAcceptanceBasisValidation(laborForm: FormGroup<any>) {
    const acceptanceBasis = laborForm.get('acceptanceBasis') as FormGroup;
    acceptanceBasis.get('type')?.valueChanges.subscribe(type => {
      this.updateAcceptanceBasisValidation(acceptanceBasis, type);
    });
  }

  validateLaborHours(proposedTotal: number, recommendedTotal: number): boolean {
    return recommendedTotal <= proposedTotal;
  }
  private readonly HOURS_MIN = 0;
  private readonly FISCAL_YEAR_PATTERN = /^\d{4}$/;
  
  // State management
  private laborStateSubject = new BehaviorSubject<Partial<LaborSectionForm>>({});
  laborState$ = this.laborStateSubject.asObservable();

  constructor(private fb: FormBuilder) {
    super();
  }

  /**
   * Creates the main labor form group
   */
  createLaborForm(): FormGroup {
    return this.fb.group({
      proposedHours: [null, [
        Validators.required,
        Validators.min(this.HOURS_MIN),
        this.validateNumber()
      ]],
      recommendedHours: [null, [
        Validators.required,
        Validators.min(this.HOURS_MIN),
        this.validateNumber()
      ]],
      laborTechnicallyAcceptable: [null, [Validators.required]],
      acceptanceBasis: this.createAcceptanceBasisGroup(),
      laborHours: this.fb.array([]),
      questionedHoursExplanation: [''],
      recommendedHoursJustification: ['']
    });
  }

  /**
   * Creates a form group for acceptance basis
   */
  private createAcceptanceBasisGroup(): FormGroup {
    return this.fb.group({
      type: [null],
      contractNumber: [''],
      methodology: [''],
      credentials: ['']
    });
  }

  /**
   * Creates a form group for a labor hour row
   */
  createLaborHourRow(data?: Partial<LaborHourDetail>): FormGroup {
    const group = this.fb.group({
      fiscalYear: ['', [
        Validators.required,
        Validators.pattern(this.FISCAL_YEAR_PATTERN)
      ]],
      laborCategory: ['', [
        Validators.required,
        Validators.maxLength(100)
      ]],
      proposedHours: [null, [
        Validators.required,
        Validators.min(this.HOURS_MIN),
        this.validateNumber()
      ]],
      recommendedHours: [null, [
        Validators.required,
        Validators.min(this.HOURS_MIN),
        this.validateNumber()
      ]],
      pageRef: ['']
    });

    if (data) {
      group.patchValue(data as any);
    }

    return group;
  }

  removeLaborHourRow(form: FormGroup, index: number): void {
    const laborHours = form.get('laborHours') as FormArray;
    laborHours.removeAt(index);
  }

  /**
   * Custom validator for number inputs
   */
  private validateNumber() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value === null || value === undefined || value === '') {
        return null;
      }
      if (isNaN(value) || !isFinite(value)) {
        return { invalidNumber: true };
      }
      return null;
    };
  }

  /**
   * Sets up conditional validation based on technical acceptability
   */
  setupConditionalValidation(form: FormGroup): void {
    const acceptabilityControl = form.get('laborTechnicallyAcceptable');
    const acceptanceBasis = form.get('acceptanceBasis') as FormGroup;
    const laborHours = form.get('laborHours') as FormArray;

    acceptabilityControl?.valueChanges.subscribe(isAcceptable => {
      this.updateValidationRules(form, isAcceptable);
      if (isAcceptable) {
        this.clearQuestionedItems(form);
      }
    });

    // Handle acceptance basis type changes
    acceptanceBasis.get('type')?.valueChanges.subscribe(type => {
      this.updateAcceptanceBasisValidation(acceptanceBasis, type);
    });
  }

  /**
   * Updates validation rules based on technical acceptability
   */
  private updateValidationRules(form: FormGroup, isAcceptable: boolean): void {
    const controls = {
      acceptanceBasis: form.get('acceptanceBasis') as FormGroup,
      questionedHoursExplanation: form.get('questionedHoursExplanation'),
      recommendedHoursJustification: form.get('recommendedHoursJustification')
    };

    if (isAcceptable) {
      controls.acceptanceBasis.get('type')?.setValidators([Validators.required]);
      controls.questionedHoursExplanation?.clearValidators();
      controls.recommendedHoursJustification?.clearValidators();
    } else {
      controls.acceptanceBasis.get('type')?.clearValidators();
      controls.questionedHoursExplanation?.setValidators([Validators.required]);
      controls.recommendedHoursJustification?.setValidators([Validators.required]);
    }

    // Update validity
    Object.values(controls).forEach(control => {
      if (control) {
        control.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  /**
   * Updates validation rules for acceptance basis fields
   */
  private updateAcceptanceBasisValidation(group: FormGroup, type: string): void {
    const controls = {
      contractNumber: group.get('contractNumber'),
      methodology: group.get('methodology'),
      credentials: group.get('credentials')
    };

    // Clear all validators first
    Object.values(controls).forEach(control => {
      if (control) {
        control.clearValidators();
        control.updateValueAndValidity({ emitEvent: false });
      }
    });

    // Set new validators based on type
    switch (type) {
      case 'sameOrSimilar':
        controls.contractNumber?.setValidators([
          Validators.required,
          Validators.pattern(/^[A-Z0-9-]+$/)
        ]);
        break;
      case 'estimatingMethod':
        controls.methodology?.setValidators([
          Validators.required,
          Validators.minLength(50)
        ]);
        break;
      case 'expertise':
        controls.credentials?.setValidators([
          Validators.required,
          Validators.minLength(50)
        ]);
        break;
    }

    // Update validity
    Object.values(controls).forEach(control => {
      if (control) {
        control.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  /**
   * Clears questioned items when switching to acceptable
   */
  private clearQuestionedItems(form: FormGroup): void {
    const laborHours = form.get('laborHours') as FormArray;
    laborHours.clear();
    form.patchValue({
      questionedHoursExplanation: '',
      recommendedHoursJustification: ''
    });
  }

  /**
   * Validates total hours
   */
  validateTotalHours(form: FormGroup): boolean {
    const proposedTotal = this.calculateTotalHours(form, 'proposedHours');
    const recommendedTotal = this.calculateTotalHours(form, 'recommendedHours');
    return recommendedTotal <= proposedTotal;
  }

  /**
   * Calculates total hours for a specific field
   */
  private calculateTotalHours(form: FormGroup, field: 'proposedHours' | 'recommendedHours'): number {
    const laborHours = form.get('laborHours') as FormArray;
    return laborHours.controls.reduce((total, control) => {
      const hours = Number(control.get(field)?.value) || 0;
      return total + hours;
    }, 0);
  }

  /**
   * Loads data into the form
   */
  loadFormData(form: FormGroup, data: Partial<LaborSectionForm>): void {
    // Clear existing data
    const laborHours = form.get('laborHours') as FormArray;
    laborHours.clear();

    // Load new data
    if (data.laborHours) {
      data.laborHours.forEach((hourData: any) => {
        const row = this.createLaborHourRow(hourData);
        laborHours.push(row);
      });
    }

    // Update form values
    form.patchValue({
      proposedHours: data.proposedHours,
      recommendedHours: data.recommendedHours,
      laborTechnicallyAcceptable: data.laborTechnicallyAcceptable,
      acceptanceBasis: data.acceptanceBasis,
      questionedHoursExplanation: data.questionedHoursExplanation,
      recommendedHoursJustification: data.recommendedHoursJustification
    });

    // Update state
    this.laborStateSubject.next(data);
  }

  /**
   * Prepares form data for submission
   */
  prepareFormData(form: FormGroup): LaborSectionForm {
    const formValue = form.value;
    const laborHours = (form.get('laborHours') as FormArray).value;

    return {
      ...formValue,
      laborHours: laborHours.map((hour: any) => ({
        fiscalYear: hour.fiscalYear,
        laborCategory: hour.laborCategory,
        proposedHours: Number(hour.proposedHours),
        recommendedHours: Number(hour.recommendedHours),
        pageRef: hour.pageRef
      }))
    };
  }

  /**
   * Gets custom error messages
   */
  getCustomErrorMessage(control: AbstractControl, field: string): string {
    if (!control.errors) return '';

    const errorMessages: { [key: string]: string } = {
      invalidNumber: 'Please enter a valid number',
      pattern: this.getPatternErrorMessage(field),
      min: 'Value must be 0 or greater',
      required: this.getRequiredErrorMessage(field)
    };

    const errorKey = Object.keys(control.errors)[0];
    return errorMessages[errorKey] || 'Invalid value';
  }

  private getPatternErrorMessage(field: string): string {
    const patterns: { [key: string]: string } = {
      fiscalYear: 'Please enter a valid 4-digit year',
      contractNumber: 'Please enter a valid contract number (letters, numbers, and hyphens only)'
    };
    return patterns[field] || 'Invalid format';
  }

  private getRequiredErrorMessage(field: string): string {
    const messages: { [key: string]: string } = {
      fiscalYear: 'Fiscal year is required',
      laborCategory: 'Labor category is required',
      proposedHours: 'Proposed hours are required',
      recommendedHours: 'Recommended hours are required'
    };
    return messages[field] || 'This field is required';
  }

  /**
   * Resets the form to its initial state
   */
  resetForm(form: FormGroup): void {
    form.reset();
    const laborHours = form.get('laborHours') as FormArray;
    laborHours.clear();
    this.laborStateSubject.next({});
  }
}