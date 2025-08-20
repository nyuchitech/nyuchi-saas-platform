declare module 'paynow' {
  export class Paynow {
    constructor(integrationId: string, integrationKey: string);
    
    resultUrl: string;
    returnUrl: string;
    
    createPayment(reference: string, email?: string): Payment;
    send(payment: Payment): Promise<InitResponse>;
    sendMobile(payment: Payment, phoneNumber: string, method: string): Promise<InitResponse>;
    pollTransaction(pollUrl: string): Promise<StatusResponse>;
  }
  
  export class Payment {
    add(name: string, amount: number): void;
    info: string;
  }
  
  export interface InitResponse {
    success: boolean;
    reference?: string;
    redirectUrl?: string;
    pollUrl?: string;
    instructions?: string;
    error?: string;
  }
  
  export interface StatusResponse {
    paid(): boolean;
    status: string;
    reference: string;
    paynowReference: string;
    amount: string;
    hash: string;
  }
}
