export type PaymentStatus = "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUNDED" | "EXPIRED" | "CANCELLED";

export type PaymentProviderName = "mock" | "cinetpay" | "flutterwave" | "stripe" | "paypal";

export interface InitializePaymentPayload {
  reference: string;
  amount: number;
  currency: string;
  phoneNumber?: string;
  paymentMethod: string;
  userId?: string;
  productId?: string;
  planType?: string;
  buyerName?: string;
  buyerEmail?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface InitializePaymentResponse {
  success: boolean;
  reference: string;
  paymentUrl?: string;
  qrCode?: string;
  status: PaymentStatus;
  provider: PaymentProviderName;
  rawResponse?: any;
}

export interface VerifyPaymentResponse {
  success: boolean;
  reference: string;
  externalReference?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  rawResponse?: any;
}

export interface RefundPaymentPayload {
  paymentId: number;
  reference: string;
  amount: number;
  reason: string;
}

export interface RefundPaymentResponse {
  success: boolean;
  refundId: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  rawResponse?: any;
}

export interface WebhookValidationResult {
  isValid: boolean;
  event?: "SUCCESS" | "FAILED" | "PENDING" | "REFUNDED" | "EXPIRED";
  reference?: string;
  amount?: number;
  currency?: string;
  externalReference?: string;
  rawPayload?: any;
}

export interface ProviderHealthCheckResult {
  provider: PaymentProviderName;
  status: "UP" | "DOWN" | "DEGRADED";
  latencyMs: number;
  message?: string;
}

// Subscription plans structural boundaries
export interface SubscriptionPlan {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  currency: string;
  benefits: string[];
}

// Invoicing structures for invoice generation
export interface InvoiceBillingInfo {
  billingName: string;
  billingEmail: string;
  billingPhone?: string;
  billingAddress?: string;
  taxId?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}
