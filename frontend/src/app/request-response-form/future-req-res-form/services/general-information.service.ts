// services/general-information.service.ts
import { Injectable } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { BaseFormService } from './base-form.service';
import { GeneralInformationForm } from '../interfaces/general-information.interface';

@Injectable({
  providedIn: 'root'
})
export class GeneralInformationService extends BaseFormService {
  constructor(private fb: FormBuilder) {
    super();
  }

  createForm(): FormGroup {
    return this.fb.group({
      programTitle: ['', [
        this.requiredWithMessage('Program title is required'),
        Validators.maxLength(200)
      ]],
      contractsPOC: this.fb.group({
        name: ['', [
          this.requiredWithMessage('POC name is required'),
          Validators.maxLength(100)
        ]],
        code: ['', [
          Validators.maxLength(50),
          Validators.pattern(/^[A-Z0-9-]+$/)
        ]],
        telephone: ['', [
          Validators.pattern(/^\d{3}-\d{3}-\d{4}$/)
        ]]
      }),
      contractNumber: ['', [
        this.requiredWithMessage('Contract number is required'),
        Validators.pattern(/^[A-Z0-9-]+$/)
      ]],
      proposalTitle: ['', [
        this.requiredWithMessage('Proposal title is required'),
        Validators.maxLength(200)
      ]],
      responseDate: [null, [
        this.requiredWithMessage('Response date is required'),
        this.futureDateValidator()
      ]],
      contractor: this.fb.group({
        companyName: ['', [
          this.requiredWithMessage('Company name is required'),
          Validators.maxLength(200)
        ]],
        city: ['', [
          this.requiredWithMessage('City is required'),
          Validators.maxLength(100)
        ]],
        state: ['', [
          this.requiredWithMessage('State is required'),
          Validators.maxLength(2),
          Validators.pattern(/^[A-Z]{2}$/)
        ]]
      }),
      deliveryPeriod: ['', [
        this.requiredWithMessage('Delivery period is required')
      ]]
    });
  }

  private futureDateValidator(): Validators {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const today = new Date();
      const inputDate = new Date(control.value);
      return inputDate > today ? null : { pastDate: true };
    };
  }

  loadFormData(data: Partial<GeneralInformationForm>) {
    const form = this.createForm();
    form.patchValue(data);
    return form;
  }

  validateForm(form: FormGroup): boolean {
    this.markFormGroupTouched(form);
    return form.valid;
  }
}