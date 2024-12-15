import { Injectable } from "@angular/core";
import { BaseFormService } from "./base-form.service";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";


@Injectable({
    providedIn: 'root'
  })
  export class MaterialService extends BaseFormService {

    constructor(private fb: FormBuilder) {
      super();
    }

    createMaterialForm(): FormGroup {
        return this.fb.group({
            materialsPurpose: [null, [Validators.required]],
            materialsTechnicallyAcceptable: [null, [Validators.required]],
            typesJustification: [null, [Validators.required]],
            amountJustification: [null, [Validators.required]],
            questionedMaterialsExplanation: [null, [Validators.required]],
            recommendedMaterialsJustification: [null, [Validators.required]],
        });
        // return this.fb.group({
        //     material: ['', [
        //     this.requiredWithMessage('Material is required'),
        //     Validators.maxLength(200)
        //     ]],
        //     unit: ['', [
        //     this.requiredWithMessage('Unit is required'),
        //     Validators.maxLength(100)
        //     ]],
        //     quantity: ['', [
        //     this.requiredWithMessage('Quantity is required'),
        //     Validators.pattern(/^[0-9]+$/)
        //     ]],
        //     unitPrice: ['', [
        //     this.requiredWithMessage('Unit price is required'),
        //     Validators.pattern(/^[0-9]+(\.[0-9]{2})?$/)
        //     ]],
        //     total: ['', [
        //     this.requiredWithMessage('Total is required'),
        //     Validators.pattern(/^[0-9]+(\.[0-9]{2})?$/)
        //     ]]
        // });
        }
  }
  
    