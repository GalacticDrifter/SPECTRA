// services/base-form.service.ts
import { Injectable } from '@angular/core';
import { AbstractControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BaseFormService {
  private formStateSubject = new BehaviorSubject<any>(null);
  formState$ = this.formStateSubject.asObservable();

  // Common validators
  protected requiredWithMessage(message: string): ValidatorFn {
    return (control: AbstractControl) => {
      const isRequired = control.hasValidator(Validators.required);
      if (isRequired && !control.value) {
        return { required: message };
      }
      return null;
    };
  }

  // Common form utility methods
  protected markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  public getErrorMessage(control: AbstractControl | null): string {
    if (!control || !control.errors) return '';

    const errors = control.errors;
    const errorKeys = Object.keys(errors);

    const errorMessageMap: { [key: string]: string } = {
      required: 'This field is required',
      email: 'Please enter a valid email',
      minlength: `Minimum length is ${errors['minlength']?.requiredLength}`,
      maxlength: `Maximum length is ${errors['maxlength']?.requiredLength}`,
      pattern: 'Invalid format',
      custom: errors['custom']
    };

    return errorMessageMap[errorKeys[0]] || 'Invalid input';
  }

  protected updateFormState(state: any) {
    this.formStateSubject.next(state);
  }
}