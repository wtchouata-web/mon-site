import {
  InitializePaymentPayload,
  InitializePaymentResponse,
  VerifyPaymentResponse,
  RefundPaymentPayload,
  RefundPaymentResponse,
  WebhookValidationResult,
  ProviderHealthCheckResult,
  PaymentProviderName
} from "../types/index.js";

export interface PaymentProvider {
  /**
   * The unique name identifying the provider (e.g., "mock", "cinetpay", etc.)
   */
  getName(): PaymentProviderName;

  /**
   * Initializes a new transaction and returns a payment redirection URL or action
   */
  initializePayment(payload: InitializePaymentPayload): Promise<InitializePaymentResponse>;

  /**
   * Checks the status of a payment directly with the provider gateway
   */
  verifyPayment(reference: string): Promise<VerifyPaymentResponse>;

  /**
   * Executes a full or partial refund for a processed payment
   */
  refundPayment(payload: RefundPaymentPayload): Promise<RefundPaymentResponse>;

  /**
   * Cancels an active or pending payment checkout session
   */
  cancelPayment(reference: string): Promise<boolean>;

  /**
   * Pulls detailed metadata about a transaction from the provider
   */
  getTransaction(reference: string): Promise<any>;

  /**
   * Validates raw incoming webhooks (verifying signatures, origin, and parsing event status)
   */
  validateWebhook(rawPayload: string, headers: Record<string, string>): Promise<WebhookValidationResult>;

  /**
   * Per-provider health and latency monitoring check
   */
  healthCheck(): Promise<ProviderHealthCheckResult>;
}
