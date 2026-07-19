export class PaymentError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(message: string, errorCode = "PAYMENT_ERROR", statusCode = 400, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigurationError extends PaymentError {
  constructor(message: string, details?: any) {
    super(message, "PROVIDER_CONFIGURATION_ERROR", 500, details);
  }
}

export class IdempotencyError extends PaymentError {
  constructor(message: string, details?: any) {
    super(message, "IDEMPOTENCY_VIOLATION", 409, details);
  }
}

export class WebhookVerificationError extends PaymentError {
  constructor(message: string, details?: any) {
    super(message, "WEBHOOK_VERIFICATION_FAILED", 401, details);
  }
}

export class TransactionFailedError extends PaymentError {
  constructor(message: string, details?: any) {
    super(message, "TRANSACTION_FAILED", 422, details);
  }
}

export class ProviderUnavailableError extends PaymentError {
  constructor(message: string, details?: any) {
    super(message, "PROVIDER_UNAVAILABLE", 503, details);
  }
}
