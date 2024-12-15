import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GeneralInformationComponent } from '../general-information/general-information.component';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { LaborComponent } from '../labor/labor.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { FormsService } from '../../forms.service';
import { DataStore } from '../../services/datastore.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-request-response-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatButtonModule,
    MatCardModule,
    GeneralInformationComponent,
    LaborComponent
  ],
  templateUrl: './request-response-form.component.html',
  styleUrl: './request-response-form.component.scss'
})
export class FutureRequestResponseFormComponent implements OnInit {
  form!: FormGroup;
  reqResEvaluation$: Observable<any[] | null>;

  constructor(private fb: FormBuilder, private formService: FormsService, private store: DataStore) {
    this.reqResEvaluation$ = this.store.requestResponseEvaluation$
  }

  ngOnInit(): void {
    this.reqResEvaluation$.subscribe((data: any[] | null) => {
      if (data) {
        console.log('Request & Response Form:', data);
        this.form = this.fb.group({
          // Other form controls will be added here
          // GeneralInformation control is added by the child component
        });
      }
    });
  }

  loadData() {
    this.formService.getRequestResponseFormData().subscribe((data) => {
      console.log('Data:', data);
      this.form.patchValue(data);
    });
  }

  submitForm() {
    if (this.form.valid) {
      const formData = this.form.value;
      console.log('Form submission:', formData);
      // Handle form submission
    }
  }
}
