export type UserPresenceStatus = "ONLINE" | "OFFLINE" | "AWAY" | "BUSY" | "INVISIBLE";

export interface UserPresence {
  userId: string;
  status: UserPresenceStatus;
  lastSeen: Date;
  customMessage?: string;
}

export type AttachmentType = "image" | "audio" | "video" | "document";

export interface MessageAttachmentPayload {
  fileUrl: string;
  fileType: AttachmentType;
  fileName: string;
  fileSize?: number;
}

export interface SocketMessagePayload {
  conversationId: string;
  recipientId: string;
  content: string;
  type?: string; // 'text', 'image', 'audio', etc.
  attachments?: MessageAttachmentPayload[];
  tempId?: string; // for optimistic UI matching and deduplication
}

export interface SocketTypingPayload {
  conversationId: string;
  recipientId: string;
  isTyping: boolean;
}

export interface SocketReceiptPayload {
  messageId: string;
  conversationId: string;
  status: "delivered" | "read";
}

export type CallType = "audio" | "video";
export type CallStatus = "ringing" | "ongoing" | "ended" | "missed" | "rejected";

export interface RTCSignalPayload {
  callId: string;
  targetId: string;
  signalData: any; // WebRTC SDP Offer / Answer / ICE Candidates
}

export interface CallInitPayload {
  conversationId: string;
  recipientId: string;
  type: CallType;
}

export interface CallActionPayload {
  callId: string;
  conversationId: string;
  callerId: string;
  recipientId: string;
}

export type NotificationChannel = "push" | "email" | "sms" | "whatsapp" | "internal";

export interface NotificationPayload {
  userId: string;
  title: string;
  content: string;
  channels: NotificationChannel[];
  metadata?: Record<string, any>;
}

export interface OpenTelemetryMetric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
}
