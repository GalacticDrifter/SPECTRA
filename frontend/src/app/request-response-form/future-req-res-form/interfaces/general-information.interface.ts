// general-information.interface.ts
export interface ContractsPOC {
    name: string;
    code: string;
    telephone: string;
  }
  
  export interface Contractor {
    companyName: string;
    city: string;
    state: string;
  }
  
  export interface GeneralInformationForm {
    programTitle: string;
    contractsPOC: ContractsPOC;
    contractNumber: string;
    proposalTitle: string;
    responseDate: Date;
    contractor: Contractor;
    deliveryPeriod: string;
  }