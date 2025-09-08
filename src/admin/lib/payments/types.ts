// Payment service interfaces and types
export interface PaymentItem {
  name: string;
  amount: number;
  quantity?: number;
  description?: string;
}

export interface PaymentRequest {
  reference: string;
  email: string;
  items: PaymentItem[];
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
  customerId?: string;
  organizationId?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  reference: string;
  redirectUrl?: string;
  instructions?: string;
  pollUrl?: string;
  error?: string;
  provider: 'paynow' | 'stripe';
  amount: number;
  currency: string;
}

export interface PaymentStatus {
  paid: boolean;
  status: string;
  reference: string;
  transactionId: string;
  amount: number;
  currency: string;
  paidAmount?: number;
  provider: 'paynow' | 'stripe';
  providerReference?: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface MobilePaymentRequest extends PaymentRequest {
  phoneNumber: string;
  mobileMethod: 'ecocash' | 'onemoney';
}

export interface WebhookData {
  provider: 'paynow' | 'stripe';
  eventType: string;
  reference: string;
  status: string;
  amount?: number;
  currency?: string;
  transactionId?: string;
  raw: any;
}

// Abstract base class for payment providers
export abstract class PaymentProvider {
  abstract readonly name: 'paynow' | 'stripe';
  
  abstract createWebPayment(request: PaymentRequest): Promise<PaymentResponse>;
  abstract checkPaymentStatus(pollUrl: string): Promise<PaymentStatus>;
  abstract handleWebhook(rawData: any): Promise<WebhookData>;
  
  // Optional methods
  createMobilePayment?(request: MobilePaymentRequest): Promise<PaymentResponse>;
  refundPayment?(transactionId: string, amount?: number): Promise<boolean>;
  
  // Helper method to calculate total amount
  protected calculateTotal(items: PaymentItem[]): number {
    return items.reduce((total, item) => {
      return total + (item.amount * (item.quantity || 1));
    }, 0);
  }
  
  // Helper method to validate currency
  protected abstract validateCurrency(currency: string): boolean;
  
  // Helper method to generate unique reference
  protected generateReference(prefix: string = 'PAY'): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}
