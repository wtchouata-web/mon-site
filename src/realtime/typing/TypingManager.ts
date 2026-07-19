import { Socket, Server } from "socket.io";
import { PayloadValidator } from "../validators/PayloadValidator.js";
import { RealtimeLogger } from "../utils/Logger.js";

/**
 * Socket Typing Manager.
 * Orchestrates transient status notifications ('typing:started', 'typing:stopped')
 * directly to channel occupants.
 */
export class TypingManager {
  constructor(private io: Server) {}

  /**
   * Dispatches typing signals to conversational peers
   */
  public async handleTyping(socket: Socket, payload: any): Promise<void> {
    const userId = socket.data.user?.id;
    if (!userId) return;

    try {
      // Syntactic Payload Verification
      PayloadValidator.validateTyping(payload);

      const targetRoom = `room:conv:${payload.conversationId}`;
      const eventName = payload.isTyping ? "typing:started" : "typing:stopped";

      // Broadcast to room except the sender
      socket.to(targetRoom).emit(eventName, {
        conversationId: payload.conversationId,
        userId
      });

      RealtimeLogger.info("Typing", `User ${userId} typing status: ${payload.isTyping} in room ${payload.conversationId}`);
    } catch (err: any) {
      RealtimeLogger.error("Typing", "Failed to process typing notification.", err, { userId });
    }
  }
}
