// Base interfaces for common patterns
interface BaseValue<T = string> {
    value: T;
    confidence?: string;
    additionalContext?: string;
    location?: string;
  }
  
  export interface TechnicalAcceptability {
    status: 'Acceptable' | 'Not Acceptable';
    basis?: string;
    justification?: string;
    recommendedChanges?: any;
  }
  
  // Contractor Information
  interface ContractorInfo {
    companyName: BaseValue;
    city: BaseValue;
    state: BaseValue;
  }
  
  // Contracts POC Information
  interface ContractsPOC {
    name: BaseValue;
    code: BaseValue;
    telephone: BaseValue;
  }
  
  // General Information Section
  interface GeneralInformation {
    programTitle: BaseValue;
    contractsPOC: ContractsPOC;
    contractNumber: BaseValue;
    proposalTitle: BaseValue;
    responseDate: BaseValue;
    contractor: ContractorInfo;
    deliveryPeriod: BaseValue;
  }
  
  // Technical Evaluation Sections
  export interface LaborEvaluation {
    laborTechnicallyAcceptable: TechnicalAcceptability;
    laborHoursSummary?: {
      value: boolean;
      acceptanceBasis: {
        type: string;
        details: any;
      };
      justification: string;
    };
    proposedHours: {
      value: number;
    };
    recommendedHours: {
      value: number;
    };
    questionedHours: {
      value: any[];
      analysis: string;
      justification: string;
    };
  }
  
  interface MaterialsEvaluation {
    materialsPurpose: BaseValue;
    materialsTechnicallyAcceptable: TechnicalAcceptability;
  }
  
  interface TravelEvaluation {
    travelPurpose: BaseValue;
    travelTechnicallyAcceptable: TechnicalAcceptability;
  }
  
  interface ODCEvaluation {
    odcTechnicallyAcceptable: TechnicalAcceptability;
  }
  
  interface OtherProposalElement {
    additionalClarifications: BaseValue<boolean>;
    technicalMethods: BaseValue<boolean>;
  }
  
  interface TermsAndConditions {
    alternateTerms: BaseValue;
    canComply: BaseValue<boolean>;
    hasExceptions: BaseValue<boolean>;
    inBestInterest: BaseValue<boolean>;
  }
  
  interface TechnicalEvaluation {
    labor: LaborEvaluation;
    materials: MaterialsEvaluation;
    travel: TravelEvaluation;
    odc: ODCEvaluation;
    otherProposalElement: OtherProposalElement;
    termsAndConditions: TermsAndConditions;
  }
  
  // Recommendation Section
  interface Comments {
    comments: BaseValue;
  }
  
  interface CompletionDate {
    completionDate: BaseValue;
  }
  
  interface Summary {
    additionalAreas: BaseValue;
  }
  
  interface Recommendation {
    additionalComments: Comments;
    date: CompletionDate;
    summary: Summary;
  }
  
  // Main Request Response Data Interface
  export interface RequestResponseData {
    generalInformation: GeneralInformation;
    technicalEvaluation: TechnicalEvaluation;
    recommendation: Recommendation;
  }
  
  // Form Data Interface for type checking form values
  export interface RequestResponseFormData {
    generalInformation: {
      programTitle: string;
      contractsPOC: {
        name: string;
        code: string;
        telephone: string;
      };
      contractNumber: string;
      proposalTitle: string;
      responseDate: Date | null;
      contractor: {
        companyName: string;
        city: string;
        state: string;
      };
      deliveryPeriod: string;
    };
    technicalEvalForm: {
      laborTechnicallyAcceptable: 'yes' | 'no';
      acceptanceBasis: string;
      estimateMethodology: string;
      laborHours: Array<{
        fiscalYear: string;
        laborCategory: string;
        proposedHours: number;
        recommendedHours: number;
      }>;
    };
    materialsForm: {
      materialsPurpose: string;
      materialsTechnicallyAcceptable: 'yes' | 'no';
      typesJustification: string;
      amountJustification: string;
      materials: Array<{
        fiscalYear: string;
        materialType: string;
        proposedQty: number;
        recommendedQty: number;
        pageRef: string;
      }>;
    };
    travelForm: {
      travelPurpose: string;
      travelTechnicallyAcceptable: 'yes' | 'no';
      tripsJustification: string;
      durationJustification: string;
      travelersJustification: string;
      travel: Array<{
        fiscalYear: string;
        destination: string;
        proposedTrips: number;
        recommendedTrips: number;
        proposedDays: number;
        recommendedDays: number;
        proposedTravelers: number;
        recommendedTravelers: number;
        pageRef: string;
      }>;
    };
    odcForm: {
      odcTechnicallyAcceptable: 'yes' | 'no';
      odcJustification: string;
      odcs: Array<{
        fiscalYear: string;
        proposedODC: string;
        otherODC: string;
        proposedQty: number;
        recommendedODC: string;
        otherRecommendedODC: string;
        recommendedQty: number;
        pageRef: string;
      }>;
    };
    termsForm: {
      hasExceptions: boolean;
      exceptionsList: string;
      canComply: boolean;
      nonCompliantTerms: string;
      inBestInterest: boolean;
      riskAssessment: string;
      termsToNegotiate: string;
      alternateTerms: string;
    };
    recommendationForm: {
      negotiationAreas: string[];
      additionalAreas: string;
      additionalComments: string;
      preparerName: string;
      preparerTitle: string;
      preparerExtension: string;
      signatureId: string;
      completionDate: Date | null;
    };
  }