import { SocketMessagePayload, SocketTypingPayload, SocketReceiptPayload, CallInitPayload } from "../types/index.js";
import { MessageValidationError } from "../errors/index.js";

/**
 * Real-Time Input Sanitization Engine.
 * Rejects oversized frames, checks constraints, and performs structure assertions.
 */
export class PayloadValidator {
  private static MAX_PAYLOAD_SIZE = 1024 * 102; // 102 KB limit on active chat frames to prevent buffer overflow attacks

  /**
   * Asserts structural consistency on message frames
   */
  public static validateMessage(payload: any): asserts payload is SocketMessagePayload {
    this.assertSize(payload);

    if (!payload || typeof payload !== "object") {
      throw new MessageValidationError("Le payload du message doit être un objet JSON valide.");
    }

    if (!payload.conversationId || typeof payload.conversationId !== "string") {
      throw new MessageValidationError("Le champ 'conversationId' est manquant ou invalide.");
    }

    if (!payload.recipientId || typeof payload.recipientId !== "string") {
      throw new MessageValidationError("Le champ 'recipientId' est manquant ou invalide.");
    }

    if (typeof payload.content !== "string" || payload.content.trim().length === 0) {
      throw new MessageValidationError("Le contenu textuel 'content' du message ne peut pas être vide.");
    }

    if (payload.attachments && !Array.isArray(payload.attachments)) {
      throw new MessageValidationError("Le paramètre 'attachments' doit être un tableau d'objets.");
    }
  }

  /**
   * Asserts structural consistency on typing notifications
   */
  public static validateTyping(payload: any): asserts payload is SocketTypingPayload {
    this.assertSize(payload);

    if (!payload || typeof payload !== "object") {
      throw new MessageValidationError("Le payload de saisie doit être un objet valide.");
    }

    if (!payload.conversationId || typeof payload.conversationId !== "string") {
      throw new MessageValidationError("Le paramètre 'conversationId' est requis.");
    }

    if (!payload.recipientId || typeof payload.recipientId !== "string") {
      throw new MessageValidationError("Le paramètre 'recipientId' est requis.");
    }

    if (typeof payload.isTyping !== "boolean") {
      throw new MessageValidationError("Le paramètre 'isTyping' doit être un booléen.");
    }
  }

  /**
   * Asserts structural consistency on delivery status updates
   */
  public static validateReceipt(payload: any): asserts payload is SocketReceiptPayload {
    this.assertSize(payload);

    if (!payload || typeof payload !== "object") {
      throw new MessageValidationError("Le payload d'accusé de réception doit être valide.");
    }

    if (!payload.messageId || typeof payload.messageId !== "string") {
      throw new MessageValidationError("Le paramètre 'messageId' est requis.");
    }

    if (!payload.conversationId || typeof payload.conversationId !== "string") {
      throw new MessageValidationError("Le paramètre 'conversationId' est requis.");
    }

    if (payload.status !== "delivered" && payload.status !== "read") {
      throw new MessageValidationError("Le paramètre 'status' doit valoir 'delivered' ou 'read'.");
    }
  }

  /**
   * Asserts call signaling payloads
   */
  public static validateCallInit(payload: any): asserts payload is CallInitPayload {
    this.assertSize(payload);

    if (!payload || typeof payload !== "object") {
      throw new MessageValidationError("Le payload de signal RTC doit être valide.");
    }

    if (!payload.conversationId || typeof payload.conversationId !== "string") {
      throw new MessageValidationError("Le paramètre 'conversationId' est requis.");
    }

    if (!payload.recipientId || typeof payload.recipientId !== "string") {
      throw new MessageValidationError("Le paramètre 'recipientId' est requis.");
    }

    if (payload.type !== "audio" && payload.type !== "video") {
      throw new MessageValidationError("Le type d'appel doit valoir 'audio' ou 'video'.");
    }
  }

  private static assertSize(payload: any): void {
    const stringified = JSON.stringify(payload);
    if (stringified.length > this.MAX_PAYLOAD_SIZE) {
      throw new MessageValidationError(`Taille du message de ${stringified.length} octets excède la limite maximale autorisée.`);
    }
  }
}
