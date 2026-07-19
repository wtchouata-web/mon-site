import { db } from "../../db/index.js";
import { messages, messageAttachments, messageStatus, conversations, users } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { SocketMessagePayload, SocketReceiptPayload } from "../types/index.js";
import { RealtimeError, MessageValidationError } from "../errors/index.js";
import { CacheService } from "./CacheService.js";

/**
 * Enterprise Message Storage Coordinator.
 * Manages message persistence, multimedia attachments, delivery logs, and idempotency guards.
 */
export class MessageService {
  private static instance: MessageService;
  private cache = CacheService.getInstance();
  private DUP_PREFIX = "msg:dup:";

  private constructor() {}

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  /**
   * Persists a newly transmitted chat message securely using transactions
   */
  public async saveMessage(
    senderId: string,
    payload: SocketMessagePayload
  ): Promise<{ message: any; attachments: any[] }> {
    // 1. Client-side deduplication token lookup (Anti-Duplicate / Anti-Replay)
    if (payload.tempId) {
      const dupKey = `${this.DUP_PREFIX}${senderId}:${payload.tempId}`;
      const isDuplicate = await this.cache.exists(dupKey);
      if (isDuplicate) {
        throw new RealtimeError("Message avec cet identifiant temporaire déjà traité.", "DUPLICATE_MESSAGE_REJECTED");
      }
      // Set short-term cache lock (30s)
      await this.cache.set(dupKey, true, 30);
    }

    // 2. Load Sender Details
    const sender = await db.select()
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);
    
    if (sender.length === 0) {
      throw new MessageValidationError("L'expéditeur spécifié n'existe pas.");
    }

    // 3. Verify / Join conversation room
    const conv = await db.select()
      .from(conversations)
      .where(eq(conversations.id, payload.conversationId))
      .limit(1);

    if (conv.length === 0) {
      throw new MessageValidationError("La conversation demandée n'existe pas.");
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const savedAttachments: any[] = [];

    // 4. Wrap database inserts inside a robust Drizzle Transaction
    const savedMessage = await db.transaction(async (tx) => {
      // Create Message
      const [msg] = await tx.insert(messages).values({
        id: messageId,
        conversationId: payload.conversationId,
        recipientId: payload.recipientId,
        senderId: senderId,
        senderName: sender[0].name,
        content: payload.content,
        isRead: false,
        type: payload.type || "general",
        createdAt: new Date()
      }).returning();

      // Create initial Message Status Receipt
      await tx.insert(messageStatus).values({
        messageId,
        userId: payload.recipientId,
        status: "sent",
        updatedAt: new Date()
      });

      // Map multimedia attachments if they exist
      if (payload.attachments && payload.attachments.length > 0) {
        for (const att of payload.attachments) {
          const attachmentId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const [attachment] = await tx.insert(messageAttachments).values({
            id: attachmentId,
            messageId,
            fileUrl: att.fileUrl,
            fileType: att.fileType,
            fileName: att.fileName,
            fileSize: att.fileSize || null,
            createdAt: new Date()
          }).returning();
          savedAttachments.push(attachment);
        }
      }

      // Touch Conversation timestamp
      await tx.update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, payload.conversationId));

      return msg;
    });

    return {
      message: savedMessage,
      attachments: savedAttachments
    };
  }

  /**
   * Registers a delivery or read receipt for a message, updating logs
   */
  public async recordReceipt(
    userId: string,
    payload: SocketReceiptPayload
  ): Promise<any> {
    const existingStatus = await db.select()
      .from(messageStatus)
      .where(
        and(
          eq(messageStatus.messageId, payload.messageId),
          eq(messageStatus.userId, userId)
        )
      )
      .limit(1);

    if (existingStatus.length > 0) {
      // Upgrade status if progressing (e.g., sent -> read, delivered -> read)
      const current = existingStatus[0].status;
      if (current === "read" || (current === "delivered" && payload.status === "delivered")) {
        return existingStatus[0]; // skip downgrading statuses
      }

      const [updated] = await db.update(messageStatus)
        .set({
          status: payload.status,
          updatedAt: new Date()
        })
        .where(eq(messageStatus.id, existingStatus[0].id))
        .returning();

      // If marked as read, also update messages.isRead for client query compatibility
      if (payload.status === "read") {
        await db.update(messages)
          .set({ isRead: true })
          .where(eq(messages.id, payload.messageId));
      }

      return updated;
    } else {
      // Create new status if it wasn't pre-populated
      const [inserted] = await db.insert(messageStatus).values({
        messageId: payload.messageId,
        userId,
        status: payload.status,
        updatedAt: new Date()
      }).returning();

      if (payload.status === "read") {
        await db.update(messages)
          .set({ isRead: true })
          .where(eq(messages.id, payload.messageId));
      }

      return inserted;
    }
  }
}
