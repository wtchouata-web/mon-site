import { Socket, Server } from "socket.io";
import { MessageService } from "../services/MessageService.js";
import { PayloadValidator } from "../validators/PayloadValidator.js";
import { SocketMessagePayload, SocketReceiptPayload } from "../types/index.js";
import { NotificationEngine } from "../services/NotificationEngine.js";
import { SocketRateLimiter } from "../middlewares/SocketRateLimiter.js";
import { RealtimeLogger } from "../utils/Logger.js";
import { MonitoringService } from "../services/MonitoringService.js";

/**
 * Socket Message Manager.
 * Orchestrates payload validation, rate-limiting, database transactions,
 * room delivery, and background offline push dispatches.
 */
export class MessageManager {
  private messageService = MessageService.getInstance();
  private notificationEngine = NotificationEngine.getInstance();
  private monitoring = MonitoringService.getInstance();

  constructor(private io: Server) {}

  /**
   * Registers a chat message event inside the active system
   */
  public async handleSendMessage(socket: Socket, payload: any): Promise<void> {
    const startTime = process.hrtime();
    const senderId = socket.data.user?.id;
    if (!senderId) return;

    try {
      // 1. Enforce Event Rate Limit
      await SocketRateLimiter.enforceRateLimit(socket);

      // 2. Syntactic Frame Validation
      PayloadValidator.validateMessage(payload);

      // 3. Persist through database transaction (MessageService handles deduplication)
      const { message, attachments } = await this.messageService.saveMessage(senderId, payload);

      const targetRoom = `room:conv:${payload.conversationId}`;

      // 4. Broadcast the parsed event to all clients connected to the room
      this.io.to(targetRoom).emit("message:received", {
        message,
        attachments,
        tempId: payload.tempId
      });

      // 5. Check if recipient has active connections. If offline, dispatch push notification
      const socketsInRoom = await this.io.in(targetRoom).fetchSockets();
      const isRecipientConnected = socketsInRoom.some(
        (s) => s.data.user?.id === payload.recipientId
      );

      if (!isRecipientConnected) {
        RealtimeLogger.info("Messaging", `Recipient ${payload.recipientId} is offline. Dispatching offline alerts.`);
        await this.notificationEngine.dispatch({
          userId: payload.recipientId,
          title: `Nouveau message de ${socket.data.user?.name || "un contact"}`,
          content: message.content,
          channels: ["push", "internal"] // FCM and internal alerts
        });
      }

      // Record performance latency and usage metrics
      this.monitoring.recordLatency("message_sending_latency", 0, { category: "messaging" });
      RealtimeLogger.profile("Messaging", "handleSendMessage", startTime, { conversationId: payload.conversationId });

    } catch (err: any) {
      RealtimeLogger.error("Messaging", "Failed to dispatch message frame.", err, { senderId });
      socket.emit("error", {
        event: "message:send_failed",
        message: err.message || "Erreur de transmission réseau.",
        errorCode: err.errorCode || "MESSAGE_DISPATCH_FAILED"
      });
    }
  }

  /**
   * Enforces message status logging (delivered, read) and signals delivery events back to peers
   */
  public async handleMessageReceipt(socket: Socket, payload: any): Promise<void> {
    const userId = socket.data.user?.id;
    if (!userId) return;

    try {
      PayloadValidator.validateReceipt(payload);

      const updatedReceipt = await this.messageService.recordReceipt(userId, payload);

      // Notify the sender in the room
      const targetRoom = `room:conv:${payload.conversationId}`;
      socket.to(targetRoom).emit("message:receipt_updated", {
        messageId: payload.messageId,
        conversationId: payload.conversationId,
        userId,
        status: payload.status,
        updatedAt: updatedReceipt.updatedAt
      });

    } catch (err: any) {
      RealtimeLogger.error("Messaging", "Failed to parse receipt frame.", err, { userId });
    }
  }
}
