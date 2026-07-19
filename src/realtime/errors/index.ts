export class RealtimeError extends Error {
  public errorCode: string;
  public details?: any;

  constructor(message: string, errorCode = "REALTIME_GENERAL_ERROR", details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SocketAuthenticationError extends RealtimeError {
  constructor(message: string, details?: any) {
    super(message, "SOCKET_AUTHENTICATION_FAILED", details);
  }
}

export class SocketRateLimitError extends RealtimeError {
  constructor(message: string, details?: any) {
    super(message, "SOCKET_RATE_LIMIT_EXCEEDED", details);
  }
}

export class MessageValidationError extends RealtimeError {
  constructor(message: string, details?: any) {
    super(message, "MESSAGE_VALIDATION_FAILED", details);
  }
}

export class RoomAccessDeniedError extends RealtimeError {
  constructor(message: string, details?: any) {
    super(message, "ROOM_ACCESS_DENIED", details);
  }
}
