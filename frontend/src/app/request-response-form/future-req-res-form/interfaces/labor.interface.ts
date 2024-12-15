// interfaces/labor-section.interface.ts

/**
 * Represents a single labor hour detail entry
 */
export interface LaborHourDetail {
    fiscalYear: string;
    laborCategory: string;
    proposedHours: number;
    recommendedHours: number;
    pageRef?: string;
  }
  
  /**
   * Defines the types of acceptance basis available
   */
  export type AcceptanceBasisType = 'sameOrSimilar' | 'estimatingMethod' | 'expertise';
  
  /**
   * Configuration for acceptance basis options
   */
  export interface AcceptanceBasisOption {
    value: AcceptanceBasisType;
    label: string;
    requiresAdditionalInfo: boolean;
  }
  
  /**
   * Represents the acceptance basis data structure
   */
  export interface AcceptanceBasis {
    type: AcceptanceBasisType;
    contractNumber?: string;  // Required for 'sameOrSimilar'
    methodology?: string;     // Required for 'estimatingMethod'
    credentials?: string;     // Required for 'expertise'
  }
  
  /**
   * Main form structure for the Labor section
   */
  export interface LaborSectionForm {
    proposedHours: number;
    recommendedHours: number;
    laborTechnicallyAcceptable: boolean;
    acceptanceBasis?: AcceptanceBasis;
    laborHours: LaborHourDetail[];
    questionedHoursExplanation?: string;
    recommendedHoursJustification?: string;
  }
  
  /**
   * Validation error messages configuration
   */
  export interface LaborValidationMessages {
    required: string;
    min: string;
    pattern: string;
    invalidNumber: string;
    [key: string]: string;
  }
  
  /**
   * Configuration for field-specific validation messages
   */
  export interface LaborFieldValidationMessages {
    fiscalYear: Partial<LaborValidationMessages>;
    laborCategory: Partial<LaborValidationMessages>;
    proposedHours: Partial<LaborValidationMessages>;
    recommendedHours: Partial<LaborValidationMessages>;
    [key: string]: Partial<LaborValidationMessages>;
  }
  
  /**
   * State management interface for the Labor section
   */
  export interface LaborSectionState {
    isLoading: boolean;
    hasChanges: boolean;
    errors: string[];
    data?: Partial<LaborSectionForm>;
  }
  
  /**
   * Configuration for table columns
   */
  export interface LaborTableColumn {
    id: string;
    label: string;
    type: 'text' | 'number' | 'actions';
    width?: string;
    sortable?: boolean;
    validator?: (value: any) => boolean;
  }
  
  /**
   * Configuration for the Labor section
   */
  export interface LaborSectionConfig {
    allowMultipleRows: boolean;
    maxRows?: number;
    defaultProposedHours?: number;
    enableAutoCalculation: boolean;
    validationMessages: LaborFieldValidationMessages;
    tableColumns: LaborTableColumn[];
  }
  
  /**
   * Event interfaces for Labor section events
   */
  export interface LaborHourChangeEvent {
    type: 'add' | 'remove' | 'update';
    row?: LaborHourDetail;
    index?: number;
    previousValue?: LaborHourDetail;
  }
  
  /**
   * Response interface for Labor section API calls
   */
  export interface LaborSectionResponse {
    success: boolean;
    data?: LaborSectionForm;
    errors?: string[];
    warnings?: string[];
  }
  
  /**
   * Interface for validation results
   */
  export interface LaborValidationResult {
    isValid: boolean;
    errors: {
      field: string;
      message: string;
      type: string;
    }[];
  }
  
  /**
   * Interface for table actions configuration
   */
  export interface LaborTableActions {
    add: {
      enabled: boolean;
      label: string;
      icon: string;
    };
    delete: {
      enabled: boolean;
      label: string;
      icon: string;
      requireConfirmation: boolean;
    };
    edit?: {
      enabled: boolean;
      label: string;
      icon: string;
    };
  }
  
  /**
   * Interface for summary calculations
   */
  export interface LaborHoursSummary {
    totalProposed: number;
    totalRecommended: number;
    difference: number;
    percentageChange: number;
  }
  
  /**
   * Interface for form control metadata
   */
  export interface LaborFormControlMetadata {
    key: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'select' | 'radio';
    required: boolean;
    validators?: {
      type: string;
      value?: any;
      message: string;
    }[];
    placeholder?: string;
    hint?: string;
    options?: {
      value: string;
      label: string;
    }[];
  }
  
  /**
   * Interface for error state
   */
  export interface LaborErrorState {
    hasErrors: boolean;
    generalErrors: string[];
    fieldErrors: {
      [key: string]: string[];
    };
  }
  
  /**
   * Type definitions for form control states
   */
  export type LaborControlState = {
    pristine: boolean;
    dirty: boolean;
    touched: boolean;
    untouched: boolean;
    valid: boolean;
    invalid: boolean;
    errors: null | {
      [key: string]: any;
    };
  };
  
  /**
   * Constants and enums for the Labor section
   */
  export enum LaborValidationErrorType {
    REQUIRED = 'required',
    MIN = 'min',
    MAX = 'max',
    PATTERN = 'pattern',
    CUSTOM = 'custom'
  }
  
  export const LABOR_VALIDATION_PATTERNS = {
    FISCAL_YEAR: /^\d{4}$/,
    CONTRACT_NUMBER: /^[A-Z0-9-]+$/,
    LABOR_CATEGORY: /^[A-Za-z0-9\s\-_()]+$/
  } as const;
  
  /**
   * Type guard for checking LaborHourDetail
   */
  export function isLaborHourDetail(obj: any): obj is LaborHourDetail {
    return (
      obj &&
      typeof obj.fiscalYear === 'string' &&
      typeof obj.laborCategory === 'string' &&
      typeof obj.proposedHours === 'number' &&
      typeof obj.recommendedHours === 'number'
    );
  }
  
  /**
   * Type guard for checking AcceptanceBasis
   */
  export function isAcceptanceBasis(obj: any): obj is AcceptanceBasis {
    return (
      obj &&
      (obj.type === 'sameOrSimilar' ||
       obj.type === 'estimatingMethod' ||
       obj.type === 'expertise')
    );
  }