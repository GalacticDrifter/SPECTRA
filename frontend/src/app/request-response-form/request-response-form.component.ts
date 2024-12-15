import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatOptionModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { Observable } from 'rxjs';
import { DataStore } from '../services/datastore.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { parse, format, isValid } from 'date-fns';
import { RequestResponseData } from './req-res.interface';

@Component({
  selector: 'app-request-response-form',
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
    MatOptionModule,
    MatGridListModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatRadioModule,
    MatTableModule,
    MatSelectModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './request-response-form.component.html',
  styleUrl: './request-response-form.component.scss'
})
export class RequestResponseFormComponent {
  form!: FormGroup;
  reqResEvaluation$: Observable<any | null>;
  laborDisplayedColumns = ['fiscalYear', 'laborCategory', 'proposedHours', 'recommendedHours', 'actions'];
  materialsDisplayedColumns = ['fiscalYear', 'materialType', 'proposedQty', 'recommendedQty', 'pageRef', 'actions'];
  travelDisplayedColumns = ['fiscalYear', 'destination', 'trips', 'days', 'travelers', 'pageRef', 'actions'];
  odcDdisplayedColumns = ['fiscalYear', 'proposedODC', 'proposedQty', 'recommendedODC', 'recommendedQty', 'pageRef', 'actions'];

  // Example predefined ODCs - replace with actual ODCs from your system
  predefinedODCs = [
    'Equipment Rental',
    'Software Licenses',
    'Training Materials',
    'Communication Costs',
    'Printing/Reproduction',
    'Facility Costs'
  ];

  availableAreas = [
    'Labor Hours',
    'Labor Categories',
    'Material Types',
    'Material Quantities',
    'Travel Requirements',
    'ODC Items',
    'Terms and Conditions'
  ];

  get generalInformation(): FormGroup {
    return this.form.get('generalInformation') as FormGroup;
  }

  get technicalEvalForm(): FormGroup {
    return this.form.get('technicalEvalForm') as FormGroup;
  }

  get laborHoursArray() {
    return this.technicalEvalForm.get('laborHours') as FormArray;
  }

  get laborTechnicallyAcceptable(): FormControl {
    return this.technicalEvalForm.get('laborTechnicallyAcceptable') as FormControl;
  }

  get materialsForm(): FormGroup {
    return this.form.get('materialsForm') as FormGroup;
  }

  get materialsArray() {
    return this.materialsForm.get('materials') as FormArray;
  }

  get travelForm(): FormGroup {
    return this.form.get('travelForm') as FormGroup;
  }

  get travelArray() {
    return this.travelForm.get('travel') as FormArray;
  }

  get odcForm(): FormGroup {
    return this.form.get('odcForm') as FormGroup;
  }

  get odcArray() {
    return this.odcForm.get('odcs') as FormArray;
  }

  get termsForm(): FormGroup {
    return this.form.get('termsForm') as FormGroup;
  }

  get otherElementsForm(): FormGroup {
    return this.form.get('otherElementsForm') as FormGroup;
  }

  get proposalAreasArray() {
    return this.otherElementsForm.get('proposalAreas') as FormArray;
  }

  get supportingInfoForm(): FormGroup {
    return this.form.get('supportingInfoForm') as FormGroup;
  }

  get referencesArray() {
    return this.supportingInfoForm.get('references') as FormArray;
  }

  get otherAttachmentsArray() {
    return this.supportingInfoForm.get('otherAttachments') as FormArray;
  }

  get recommendationForm(): FormGroup {
    return this.form.get('recommendationForm') as FormGroup;
  }

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private store: DataStore,
    private changeDetectorRefs: ChangeDetectorRef
  ) {
    this.reqResEvaluation$ = this.store.requestResponseEvaluation$
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadJsonData();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      generalInformation: this.fb.group({
        programTitle: [''],
        contractsPOC: this.fb.group({
          name: [''],
          code: [''],
          telephone: ['']
        }),
        contractNumber: [''],
        proposalTitle: [''],
        responseDate: [''],
        contractor: this.fb.group({
          companyName: [''],
          city: [''],
          state: [''],
        }),
        deliveryPeriod: [''],
        technicalPOC: this.fb.group({
          name: [''],
          code: [''],
          telephone: [''],
        }),
        programManager: this.fb.group({
          name: [''],
          code: [''],
          telephone: [''],
        })
      }),
      technicalEvalForm: this.fb.group({
        proposedHours: [''],
        recommendedHours: [''],
        laborTechnicallyAcceptable: [''],
        acceptanceBasis: [''],  // Added for basis selection
        similarContractNumber: [''],  // For Same/Similar Effort
        estimateMethodology: [''],    // For Estimating Method
        expertCredentials: [''],      // For Subject Matter Expertise
        questionedHoursExplanation: [''],
        recommendedHoursJustification: [''],
        laborHours: this.fb.array([])
      }),
      materialsForm: this.fb.group({
        materialsPurpose: [''],
        materialsTechnicallyAcceptable: [''],
        typesJustification: [''],
        amountJustification: [''],
        questionedMaterialsExplanation: [''],
        recommendedMaterialsJustification: [''],
        materials: this.fb.array([])
      }),
      travelForm: this.fb.group({
        travelPurpose: [''],
        travelTechnicallyAcceptable: [''],
        tripsJustification: [''],
        durationJustification: [''],
        travelersJustification: [''],
        questionedTravelExplanation: [''],
        recommendedTravelJustification: [''],
        travel: this.fb.array([])
      }),
      odcForm: this.fb.group({
        odcTechnicallyAcceptable: [''],
        odcJustification: [''],
        questionedODCExplanation: [''],
        recommendedODCJustification: [''],
        odcs: this.fb.array([])
      }),
      termsForm: this.fb.group({
        hasExceptions: [''],
        exceptionsList: [''],
        canComply: [''],
        nonCompliantTerms: [''],
        inBestInterest: [''],
        riskAssessment: [''],
        termsToNegotiate: [''],
        alternateTerms: ['']
      }),
      otherElementsForm: this.fb.group({
        proposalAreas: this.fb.array([])
      }),
      supportingInfoForm: this.fb.group({
        references: this.fb.array([]),
        standardAttachments: [[]],
        otherAttachments: this.fb.array([])
      }),
      recommendationForm: this.fb.group({
        negotiationAreas: [[]],
        additionalAreas: [''],
        additionalComments: [''],
        preparerName: [''],
        preparerTitle: [''],
        preparerExtension: [''],
        signatureId: [''],
        completionDate: [new Date()]
      })
    });
  }

  private loadJsonData(): void {
    this.reqResEvaluation$.subscribe((res: any | null) => {
      if (res) {
        let data: any = res.sections;
        console.log('Request & Response Form:', data);

        // Helper function to safely extract value from response object
        const getValue = (obj: any) => obj?.value || '';
        const getNestedValue = (obj: any, path: string) => path.split('.').reduce((o, i) => (o?.[i] === undefined ? '' : o[i]), obj);

        // Load General Information
        if (data.generalInformation?.responses) {
          const generalInfo = data.generalInformation.responses;
          this.form.patchValue({
            generalInformation: {
              programTitle: getValue(generalInfo.programTitle),
              contractsPOC: {
                name: getNestedValue(generalInfo.contractsPOC, 'value.name'),
                code: getNestedValue(generalInfo.contractsPOC, 'value.code'),
                telephone: getNestedValue(generalInfo.contractsPOC, 'value.telephone')
              },
              contractNumber: getValue(generalInfo.contractNumber),
              proposalTitle: getValue(generalInfo.proposalTitle),
              responseDate: generalInfo.responseDate?.value ? new Date(generalInfo.responseDate.value) : null,
              contractor: {
                companyName: getNestedValue(generalInfo.contractor, 'value.companyName'),
                city: getNestedValue(generalInfo.contractor, 'value.city'),
                state: getNestedValue(generalInfo.contractor, 'value.state')
              },
              deliveryPeriod: generalInfo.deliveryPeriod?.value ? this.parseDateString(generalInfo.deliveryPeriod.value) : null,
              technicalPOC: {
                name: getNestedValue(generalInfo.technicalPOC, 'value.name'),
                code: getNestedValue(generalInfo.technicalPOC, 'value.code'),
                telephone: getNestedValue(generalInfo.technicalPOC, 'value.telephone')
              },
              programManager: {
                name: getNestedValue(generalInfo.programManager, 'value.name'),
                code: getNestedValue(generalInfo.programManager, 'value.code'),
                telephone: getNestedValue(generalInfo.programManager, 'value.telephone')
              }
            }
          });
        }

        // Load Technical Evaluation
        if (data.technicalEvaluation?.subsections) {
          const techEval = data.technicalEvaluation.subsections;

          // Load Labor Section
          if (techEval.labor?.responses) {
            const labor = techEval.labor.responses;
            const laborSummary = labor.laborHoursSummary;

            // Map labor hours summary and basis
            this.form.patchValue({
              technicalEvalForm: {
                proposedHours: labor.proposedHours?.value || 0,
                recommendedHours: labor.recommendedHours?.value || 0,
                laborTechnicallyAcceptable:
                  labor.laborHoursSummary?.value === true ? 'yes' : 'no',
                acceptanceBasis: laborSummary?.acceptanceBasis?.type || ''
              }
            });

            // Handle basis-specific details if present
            if (laborSummary?.acceptanceBasis) {
              const details = laborSummary.acceptanceBasis.details || {};
              const basisType = laborSummary.acceptanceBasis.type;

              console.log('Basis Details:', details); // For debugging

              switch (basisType) {
                case 'sameOrSimilar':
                  this.form.patchValue({
                    technicalEvalForm: {
                      similarContractNumber: details.contractNumber || ''
                    }
                  });
                  break;
                case 'estimatingMethod':
                  this.form.patchValue({
                    technicalEvalForm: {
                      estimateMethodology: details.methodology || ''
                    }
                  });
                  break;
                case 'expertise':
                  this.form.patchValue({
                    technicalEvalForm: {
                      expertCredentials: details.credentials || ''
                    }
                  });
                  break;
              }
            }

            // Load questioned hours if any
            if (labor.questionedHours?.value?.length) {
              labor.questionedHours.value.forEach((item: any) => {
                this.laborHoursArray.push(this.fb.group({
                  fiscalYear: [item.fiscalYear],
                  laborCategory: [item.laborCategory],
                  proposedHours: [item.proposedHours],
                  recommendedHours: [item.recommendedHours],
                  pageRef: [item.pageRef]
                }));
              });

              // Load explanations and justifications
              if (labor.questionedHours.analysis || labor.questionedHours.justification) {
                this.form.patchValue({
                  technicalEvalForm: {
                    questionedHoursExplanation: labor.questionedHours.analysis || '',
                    recommendedHoursJustification: labor.questionedHours.justification || ''
                  }
                });
              }
            }
          }

          // Load Materials Section
          if (techEval.materials?.responses) {
            const materials = techEval.materials.responses;

            this.form.patchValue({
              materialsForm: {
                materialsPurpose: getValue(materials.materialsPurpose),
                materialsTechnicallyAcceptable:
                  materials.materialsTechnicalAcceptability?.value === true ||
                    materials.materialsTechnicalAcceptability?.status === 'Acceptable'
                    ? 'yes' : 'no',
                typesJustification: materials.materialsTechnicalAcceptability?.justification || '',
                amountJustification: materials.materialsTechnicalAcceptability?.analysis || ''
              }
            });

            // Load questioned materials if any
            if (materials.questionedMaterials?.value?.length) {
              materials.questionedMaterials.value.forEach((item: any) => {
                this.materialsArray.push(this.fb.group({
                  fiscalYear: [item.fiscalYear || ''],
                  materialType: [item.materialType || ''],
                  proposedQty: [item.proposedQty || ''],
                  recommendedQty: [item.recommendedQty || ''],
                  pageRef: [item.pageRef || '']
                }));
              });

              // Load explanations if available
              if (materials.questionedMaterials.analysis || materials.questionedMaterials.justification) {
                this.form.patchValue({
                  materialsForm: {
                    questionedMaterialsExplanation: materials.questionedMaterials.analysis || '',
                    recommendedMaterialsJustification: materials.questionedMaterials.justification || ''
                  }
                });
              }
            }
          }

          // Load Travel Section
          if (techEval.travel?.responses) {
            const travel = techEval.travel.responses;
            this.form.patchValue({
              travelForm: {
                travelPurpose: getValue(travel.travelPurpose),
                travelTechnicallyAcceptable: getValue(travel.travelAcceptability) ? 'yes' : 'no',
                tripsJustification: travel.travelAcceptability?.justification || '',
                durationJustification: travel.travelAcceptability?.analysis || '',
                travelersJustification: ''  // Add if available in response
              }
            });

            // Load questioned travel
            if (travel.questionedTravel?.value?.length) {
              travel.questionedTravel.value.forEach((item: any) => {
                this.travelArray.push(this.fb.group({
                  fiscalYear: item.fiscalYear,
                  destination: item.destination,
                  proposedTrips: item.proposedTrips,
                  recommendedTrips: item.recommendedTrips,
                  proposedDays: item.proposedDays,
                  recommendedDays: item.recommendedDays,
                  proposedTravelers: item.proposedTravelers,
                  recommendedTravelers: item.recommendedTravelers,
                  pageRef: item.pageRef
                }));
              });
            }
          }

          // Load ODC Section
          if (techEval.otherDirectCosts?.responses) {
            const odc = techEval.otherDirectCosts.responses;
            console.log('ODC List Data:', odc.odcList?.value); // For debugging
            this.form.patchValue({
              odcForm: {
                odcTechnicallyAcceptable: getValue(odc.odcAcceptability) ? 'yes' : 'no',
                odcJustification: odc.odcAcceptability?.justification || '',
                odcList: getValue(odc.odcList),
                questionedODCExplanation: odc.odcAcceptability?.analysis || '',
                recommendedODCJustification: odc.odcAcceptability?.justification || '',
              }
            });

            // Load ODC items
            if (odc.odcList?.value?.length) {
              odc.odcList.value.forEach((item: any) => {
                this.odcArray.push(this.fb.group({
                  fiscalYear: item.fiscalYear ?? '2024',
                  proposedODC: item.proposedOdc,
                  proposedQty: item.proposedQuantity,
                  recommendedODC: item.recommendedOdc,
                  recommendedQty: item.recommendedQuantity,
                  pageRef: item.pageRef
                }));
              });

              this.odcArray.controls = this.odcArray.controls.map((control: any, index: number) => {
                return control;
              });
            }
          }

          // Load Terms and Conditions
          if (techEval.termsAndConditions?.responses) {
            const terms = techEval.termsAndConditions.responses;
            this.form.patchValue({
              termsForm: {
                // Convert boolean to yes/no for radio buttons
                hasExceptions: terms.exceptions?.value === true ? 'yes' : 'no',
                exceptionsList: terms.exceptions?.analysis || '',

                canComply: terms.governmentCompliance?.value === true ? 'yes' : 'no',
                nonCompliantTerms: terms.governmentCompliance?.analysis || '',

                inBestInterest: terms.bestInterest?.value === true ? 'yes' : 'no',
                riskAssessment: terms.bestInterest?.analysis || '',
                termsToNegotiate: terms.bestInterest?.justification || '',

                alternateTerms: getValue(terms.alternateTerms)
              }
            });

            // Log the values to verify
            console.log('Terms Form Values:', {
              original: terms,
              mapped: this.form.get('termsForm')?.value
            });
          }
        }

        // Load Supporting Information
        if (data.supportingInformation?.responses) {
          const supporting = data.supportingInformation.responses;

          // Load References
          if (supporting.references?.value) {
            supporting.references.value.forEach((ref: any) => {
              this.referencesArray.push(this.fb.group({
                title: ref.documentTitle,
                date: ref.date !== 'N/A' ? new Date(ref.date) : null,
                description: ref.description
              }));
            });
          }

          // Load Standard Attachments
          this.form.patchValue({
            supportingInfoForm: {
              standardAttachments: getValue(supporting.standardAttachments)
            }
          });

          // Load Other Attachments
          if (supporting.otherAttachments?.value) {
            supporting.otherAttachments.value.forEach((attachment: any) => {
              this.otherAttachmentsArray.push(this.fb.group({
                title: attachment.title,
                description: attachment.description,
                fileName: ''  // Add if available
              }));
            });
          }
        }

        // Load Recommendation
        if (data.recommendation?.responses) {
          const recommendation = data.recommendation.responses;
          this.form.patchValue({
            recommendationForm: {
              negotiationAreas: recommendation.areasToNegotiate?.value?.map((item: any) => item.area) || [],
              additionalComments: getValue(recommendation.additionalComments),
              preparerName: getNestedValue(recommendation.preparer, 'value.name'),
              preparerTitle: getNestedValue(recommendation.preparer, 'value.title'),
              preparerExtension: getNestedValue(recommendation.preparer, 'value.extension'),
              signatureId: getNestedValue(recommendation.signature, 'value.signatureId'),
              completionDate: recommendation.date?.value ? new Date(recommendation.date.value) : new Date()
            }
          });
        }
      }
    });
  }

  // Add helper method for handling basis changes
  onAcceptanceBasisChange(event: any): void {
    // Clear all basis-specific fields
    this.form.patchValue({
      technicalEvalForm: {
        similarContractNumber: '',
        estimateMethodology: '',
        expertCredentials: ''
      }
    });
  }

  // Helper method to safely access nested object properties
  private getNestedValue(obj: any, path: string, defaultValue: any = ''): any {
    return path.split('.').reduce((curr, key) =>
      (curr && curr[key] !== undefined) ? curr[key] : defaultValue, obj);
  }

  addLaborHourRow() {
    const laborHourGroup = this.fb.group({
      fiscalYear: [''],
      laborCategory: [''],
      proposedHours: [''],
      recommendedHours: ['']
    });
    this.laborHoursArray.push(laborHourGroup);

    // Quick fix to update the displayed rows
    this.laborHoursArray.controls = this.laborHoursArray.controls.map((control: any, index: number) => {
      return control;
    });
  }

  removeLaborHourRow(index: number) {
    this.laborHoursArray.removeAt(index);
    // Quick fix to update the displayed rows
    this.laborHoursArray.controls = this.laborHoursArray.controls.map((control: any, index: number) => {
      return control;
    });
  }

  addMaterialRow() {
    const materialGroup = this.fb.group({
      fiscalYear: [''],
      materialType: [''],
      proposedQty: [''],
      recommendedQty: [''],
      pageRef: ['']
    });
    this.materialsArray.push(materialGroup);

    // Quick fix to update the displayed rows
    this.materialsArray.controls = this.materialsArray.controls.map((control: any, index: number) => {
      return control;
    });
  }

  removeMaterialRow(index: number) {
    this.materialsArray.removeAt(index);
    // Quick fix to update the displayed rows
    this.materialsArray.controls = this.materialsArray.controls.map((control: any, index: number) => {
      return control;
    });
  }

  addTravelRow() {
    const travelGroup = this.fb.group({
      fiscalYear: [''],
      destination: [''],
      proposedTrips: [''],
      recommendedTrips: [''],
      proposedDays: [''],
      recommendedDays: [''],
      proposedTravelers: [''],
      recommendedTravelers: [''],
      pageRef: ['']
    });
    this.travelArray.push(travelGroup);
    // Quick fix to update the displayed rows
    this.travelArray.controls = this.travelArray.controls.map((control: any, index: number) => {
      return control;
    });
  }

  removeTravelRow(index: number) {
    this.travelArray.removeAt(index);
    // Quick fix to update the displayed rows
    this.travelArray.controls = this.travelArray.controls.map((control: any, index: number) => {
      return control;
    });
  }

  addODCRow() {
    const odcGroup = this.fb.group({
      fiscalYear: [''],
      proposedODC: [''],
      otherODC: [''],
      proposedQty: [''],
      recommendedODC: [''],
      otherRecommendedODC: [''],
      recommendedQty: [''],
      pageRef: ['']
    });
    this.odcArray.push(odcGroup);
    // Quick fix to update the displayed rows
    this.odcArray.controls = this.odcArray.controls.map((control: any, index: number) => {
      return control;
    });
  }

  removeODCRow(index: number) {
    this.odcArray.removeAt(index);
    // Quick fix to update the displayed rows
    this.odcArray.controls = this.odcArray.controls.map((control: any, index: number) => {
      return control;
    });
  }

  addProposalArea() {
    const proposalArea = this.fb.group({
      areaTitle: [''],
      technicalQuestions: [''],
      findings: ['']
    });
    this.proposalAreasArray.push(proposalArea);
  }

  removeProposalArea(index: number) {
    this.proposalAreasArray.removeAt(index);
  }

  addReference() {
    const reference = this.fb.group({
      title: [''],
      date: [null],
      description: ['']
    });
    this.referencesArray.push(reference);
  }

  removeReference(index: number) {
    this.referencesArray.removeAt(index);
  }

  addOtherAttachment() {
    const attachment = this.fb.group({
      title: [''],
      description: [''],
      fileName: ['']
    });
    this.otherAttachmentsArray.push(attachment);
  }

  removeOtherAttachment(index: number) {
    this.otherAttachmentsArray.removeAt(index);
  }

  addArea() {
    // Implementation for adding custom areas if needed
  }

  submitForm(): void {
    if (this.form.valid) {
      try {
        const formData = this.form.value;
        const updatedReqResForm = this.mapFormDataToRequestResponse(formData);

        // Log the submission data for verification
        console.log('Submitting form data:', updatedReqResForm);

        this.store.submitRequestResponseForm(updatedReqResForm).subscribe({
          next: () => {
            this.showNotification('Request & Response form saved!');
            this.form.reset();
          },
          error: (error) => {
            console.error('Submission error:', error);
            this.showNotification('An error occurred during submission. Please try again.');
          }
        });
      } catch (error) {
        console.error('Mapping error:', error);
        this.showNotification('An error occurred while processing the form data. Please check your inputs.');
      }
    } else {
      this.showNotification('Please fill out all required fields.');
      this.markAllAsTouched(this.form);
    }
  }

  private mapFormDataToRequestResponse(formData: any): any {
    // Get the current evaluation data
    const currentData = this.store.getCurrentEvaluation();

    const updatedData = {
      metadata: {
        evaluationDate: new Date().toISOString(),
        schemaVersion: "1.0",
        modelUsed: "human-evaluator"
      },
      sections: {
        generalInformation: {
          ...currentData?.sections?.generalInformation,
          responses: {
            ...currentData?.sections?.generalInformation?.responses,
            programTitle: {
              ...currentData?.sections?.generalInformation?.responses?.programTitle,
              value: formData.generalInformation.programTitle
            },
            contractsPOC: {
              ...currentData?.sections?.generalInformation?.responses?.contractsPOC,
              value: {
                name: formData.generalInformation.contractsPOC.name,
                code: formData.generalInformation.contractsPOC.code,
                telephone: formData.generalInformation.contractsPOC.telephone
              }
            },
            contractNumber: {
              ...currentData?.sections?.generalInformation?.responses?.contractNumber,
              value: formData.generalInformation.contractNumber
            },
            proposalTitle: {
              ...currentData?.sections?.generalInformation?.responses?.proposalTitle,
              value: formData.generalInformation.proposalTitle
            },
            responseDate: {
              ...currentData?.sections?.generalInformation?.responses?.responseDate,
              value: formData.generalInformation.responseDate ?
                format(formData.generalInformation.responseDate, 'MM-dd-yyyy') : null
            },
            contractor: {
              ...currentData?.sections?.generalInformation?.responses?.contractor,
              value: {
                companyName: formData.generalInformation.contractor.companyName,
                city: formData.generalInformation.contractor.city,
                state: formData.generalInformation.contractor.state
              }
            },
            deliveryPeriod: {
              ...currentData?.sections?.generalInformation?.responses?.deliveryPeriod,
              value: formData.generalInformation.deliveryPeriod ?
                format(formData.generalInformation.deliveryPeriod, 'MMMM d, yyyy') : null
            },
            technicalPOC: {
              ...currentData?.sections?.generalInformation?.responses?.technicalPOC,
              value: {
                name: formData.generalInformation.technicalPOC.name,
                code: formData.generalInformation.technicalPOC.code,
                telephone: formData.generalInformation.technicalPOC.telephone
              }
            },
            programManager: {
              ...currentData?.sections?.generalInformation?.responses?.programManager,
              value: {
                name: formData.generalInformation.programManager.name,
                code: formData.generalInformation.programManager.code,
                telephone: formData.generalInformation.programManager.telephone
              }
            }
          },
          sectionId: "section1",
          title: "General Information"
        },
        technicalEvaluation: {
          ...currentData?.sections?.technicalEvaluation,
          responses: {},
          subsections: {
            labor: {
              ...currentData?.sections?.technicalEvaluation?.subsections?.labor,
              responses: {
                ...currentData?.sections?.technicalEvaluation?.subsections?.labor?.responses,
                laborHoursSummary: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.labor?.responses?.laborHoursSummary,
                  value: formData.technicalEvalForm.laborTechnicallyAcceptable === 'yes',
                  acceptanceBasis: {
                    type: formData.technicalEvalForm.acceptanceBasis,
                    details: this.getAcceptanceBasisDetails(formData.technicalEvalForm)
                  },
                  justification: this.getAcceptanceBasisJustification(formData.technicalEvalForm)
                },
                proposedHours: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.labor?.responses?.proposedHours,
                  value: Number(formData.technicalEvalForm.proposedHours) || 0
                },
                recommendedHours: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.labor?.responses?.recommendedHours,
                  value: Number(formData.technicalEvalForm.recommendedHours) || 0
                },
                questionedHours: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.labor?.responses?.questionedHours,
                  value: this.laborHoursArray.value,
                  analysis: formData.technicalEvalForm.questionedHoursExplanation || '',
                  justification: formData.technicalEvalForm.recommendedHoursJustification || ''
                }
              },
              sectionId: "laborSection",
              title: "A. LABOR"
            },
            materials: {
              ...currentData?.sections?.technicalEvaluation?.subsections?.materials,
              responses: {
                ...currentData?.sections?.technicalEvaluation?.subsections?.materials?.responses,
                materialsPurpose: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.materials?.responses?.materialsPurpose,
                  value: formData.materialsForm.materialsPurpose
                },
                materialsTechnicallyAcceptable: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.materials?.responses?.materialsTechnicallyAcceptable,
                  value: formData.materialsForm.materialsTechnicallyAcceptable === 'yes',
                  justification: formData.materialsForm.typesJustification,
                  analysis: formData.materialsForm.amountJustification
                },
                questionedMaterials: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.materials?.responses?.questionedMaterials,
                  value: this.materialsArray.value,
                  analysis: formData.materialsForm.questionedMaterialsExplanation,
                  justification: formData.materialsForm.recommendedMaterialsJustification
                }
              },
              sectionId: "materialsSection",
              title: "B. MATERIALS"
            },
            travel: {
              ...currentData?.sections?.technicalEvaluation?.subsections?.travel,
              responses: {
                ...currentData?.sections?.technicalEvaluation?.subsections?.travel?.responses,
                travelPurpose: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.travel?.responses?.travelPurpose,
                  value: formData.travelForm.travelPurpose
                },
                travelAcceptability: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.travel?.responses?.travelAcceptability,
                  value: formData.travelForm.travelTechnicallyAcceptable === 'yes',
                  justification: formData.travelForm.tripsJustification,
                  questioned_items: formData.travelForm.travelTechnicallyAcceptable === 'no' ?
                    ["Number of trips", "Trip duration", "Number of travelers"] : []
                },
                questionedTravel: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.travel?.responses?.questionedTravel,
                  value: this.travelArray.value,
                  analysis: formData.travelForm.questionedTravelExplanation,
                  justification: formData.travelForm.recommendedTravelJustification
                }
              },
              sectionId: "travelSection",
              title: "C. TRAVEL"
            },
            otherDirectCosts: {
              ...currentData?.sections?.technicalEvaluation?.subsections?.otherDirectCosts,
              responses: {
                ...currentData?.sections?.technicalEvaluation?.subsections?.otherDirectCosts?.responses,
                odcList: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.otherDirectCosts?.responses?.odcList,
                  value: formData.odcForm.odcs.map((odc: any) => odc.proposedODC)
                },
                odcAcceptability: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.otherDirectCosts?.responses?.odcAcceptability,
                  value: formData.odcForm.odcTechnicallyAcceptable === 'yes',
                  justification: formData.odcForm.odcJustification
                },
                questionedODCs: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.otherDirectCosts?.responses?.questionedODCs,
                  value: formData.odcForm.odcs,
                  analysis: formData.odcForm.questionedODCExplanation,
                  justification: formData.odcForm.recommendedODCJustification
                }
              },
              sectionId: "odcSection",
              title: "D. OTHER DIRECT COSTS (ODC)"
            },
            termsAndConditions: {
              ...currentData?.sections?.technicalEvaluation?.subsections?.termsAndConditions,
              responses: {
                ...currentData?.sections?.technicalEvaluation?.subsections?.termsAndConditions?.responses,
                exceptions: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.termsAndConditions?.responses?.exceptions,
                  value: formData.termsForm.hasExceptions === 'yes',
                  analysis: formData.termsForm.exceptionsList
                },
                governmentCompliance: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.termsAndConditions?.responses?.governmentCompliance,
                  value: formData.termsForm.canComply === 'yes',
                  analysis: formData.termsForm.nonCompliantTerms
                },
                bestInterest: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.termsAndConditions?.responses?.bestInterest,
                  value: formData.termsForm.inBestInterest === 'yes',
                  analysis: formData.termsForm.riskAssessment,
                  justification: formData.termsForm.termsToNegotiate
                },
                alternateTerms: {
                  ...currentData?.sections?.technicalEvaluation?.subsections?.termsAndConditions?.responses?.alternateTerms,
                  value: formData.termsForm.alternateTerms
                }
              },
              sectionId: "termsSection",
              title: "E. CONTRACTOR TERMS AND CONDITIONS OR GROUND RULES/ASSUMPTIONS"
            }
          },
          sectionId: "section2",
          title: "Technical Evaluation Findings"
        },
        supportingInformation: {
          ...currentData?.sections?.supportingInformation,
          responses: {
            ...currentData?.sections?.supportingInformation?.responses,
            references: {
              ...currentData?.sections?.supportingInformation?.responses?.references,
              value: this.referencesArray.value.map((ref: any) => ({
                documentTitle: ref.title,
                date: ref.date ? format(ref.date, 'MM-dd-yyyy') : 'N/A',
                description: ref.description
              }))
            },
            standardAttachments: {
              ...currentData?.sections?.supportingInformation?.responses?.standardAttachments,
              value: formData.supportingInfoForm.standardAttachments
            },
            otherAttachments: {
              ...currentData?.sections?.supportingInformation?.responses?.otherAttachments,
              value: this.otherAttachmentsArray.value
            }
          },
          sectionId: "section3",
          title: "Supporting Technical Information"
        },
        recommendation: {
          ...currentData?.sections?.recommendation,
          responses: {
            ...currentData?.sections?.recommendation?.responses,
            areasToNegotiate: {
              ...currentData?.sections?.recommendation?.responses?.areasToNegotiate,
              value: formData.recommendationForm.negotiationAreas.map((area: string) => ({
                area,
                justification: `Negotiation required for ${area}`
              }))
            },
            additionalComments: {
              ...currentData?.sections?.recommendation?.responses?.additionalComments,
              value: formData.recommendationForm.additionalComments
            },
            preparer: {
              ...currentData?.sections?.recommendation?.responses?.preparer,
              value: {
                name: formData.recommendationForm.preparerName,
                title: formData.recommendationForm.preparerTitle,
                extension: formData.recommendationForm.preparerExtension
              }
            },
            signature: {
              ...currentData?.sections?.recommendation?.responses?.signature,
              value: {
                signatureData: "[Digital Signature]",
                signatureId: formData.recommendationForm.signatureId,
                signatureDate: format(new Date(), 'MM-dd-yyyy HH:mm:ss')
              }
            },
            date: {
              ...currentData?.sections?.recommendation?.responses?.date,
              value: formData.recommendationForm.completionDate ?
                format(formData.recommendationForm.completionDate, 'MM-dd-yyyy') :
                format(new Date(), 'MM-dd-yyyy')
            }
          },
          sectionId: "section4",
          title: "Recommendation"
        }
      }
    };

    return updatedData;

    // // Deep merge function to preserve all fields while updating values
    // const mergedData = this.deepMerge(currentData || {}, updatedData);

    // return mergedData;
  }

  // Helper function to perform deep merge
  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  // Helper function to check if value is an object
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }


  // Helper method to preserve existing values when updating
  private preserveExistingValues(original: any, updated: any): any {
    const result = { ...original };

    Object.keys(updated).forEach(key => {
      if (updated[key] !== null && updated[key] !== undefined) {
        if (typeof updated[key] === 'object' && !Array.isArray(updated[key])) {
          result[key] = this.preserveExistingValues(original[key] || {}, updated[key]);
        } else {
          result[key] = updated[key];
        }
      }
    });

    return result;
  }

  private markAllAsTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      if (control instanceof FormGroup) {
        this.markAllAsTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }

  private showNotification(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // Helper methods for mapping
  private getAcceptanceBasisDetails(formData: any): any {
    switch (formData.acceptanceBasis) {
      case 'sameOrSimilar':
        return { contractNumber: formData.similarContractNumber };
      case 'estimatingMethod':
        return { methodology: formData.estimateMethodology };
      case 'expertise':
        return { credentials: formData.expertCredentials };
      default:
        return {};
    }
  }

  private getAcceptanceBasisJustification(formData: any): string {
    switch (formData.acceptanceBasis) {
      case 'sameOrSimilar':
        return `Based on similar contract ${formData.similarContractNumber}`;
      case 'estimatingMethod':
        return formData.estimateMethodology;
      case 'expertise':
        return formData.expertCredentials;
      default:
        return '';
    }
  }

  private parseDateString(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Handle various date formats
    const formats = [
      'MMMM d, yyyy',   // "October 1, 2025"
      'MM-dd-yyyy',     // "10-01-2025"
      'yyyy-MM-dd',     // "2025-10-01"
      'M/d/yyyy'        // "10/1/2025"
    ];

    for (const format of formats) {
      try {
        const parsed = parse(dateStr, format, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch (e) {
        continue;
      }
    }

    // If no format works, try native Date parsing as fallback
    const fallbackDate = new Date(dateStr);
    return isValid(fallbackDate) ? fallbackDate : null;
  }
}
