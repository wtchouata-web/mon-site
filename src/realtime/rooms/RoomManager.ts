import { Socket } from "socket.io";
import { RealtimeLogger } from "../utils/Logger.js";
import { db } from "../../db/index.js";
import { conversations } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { RoomAccessDeniedError } from "../errors/index.js";

/**
 * Socket Room Manager.
 * Handles channel-based client multiplexing, authorization guards, and security boundaries.
 */
export class RoomManager {
  /**
   * Guides a socket connection to join a secure chat room
   */
  public async joinConversation(socket: Socket, conversationId: string): Promise<void> {
    const userId = socket.data.user?.id;
    if (!userId) return;

    // Security check: Verify conversation membership
    const conv = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (conv.length === 0) {
      throw new RoomAccessDeniedError("La conversation demandée n'existe pas ou a été supprimée.");
    }

    const { userOneId, userTwoId } = conv[0];
    if (userOneId !== userId && userTwoId !== userId) {
      // In a broader high-scale app, check the conversation_members table for groups
      RealtimeLogger.warn("Security", `User ${userId} attempted unauthorized join on room ${conversationId}`);
      throw new RoomAccessDeniedError("Vous n'êtes pas autorisé à rejoindre cette conversation.");
    }

    const roomName = `room:conv:${conversationId}`;
    await socket.join(roomName);

    RealtimeLogger.info("Rooms", `User ${userId} joined room: ${roomName}`);
    
    // Broadcast notification to other members
    socket.to(roomName).emit("room:user_joined", {
      userId,
      conversationId
    });
  }

  /**
   * Leaves an active conversation room
   */
  public async leaveConversation(socket: Socket, conversationId: string): Promise<void> {
    const userId = socket.data.user?.id;
    if (!userId) return;

    const roomName = `room:conv:${conversationId}`;
    await socket.leave(roomName);

    RealtimeLogger.info("Rooms", `User ${userId} left room: ${roomName}`);

    socket.to(roomName).emit("room:user_left", {
      userId,
      conversationId
    });
  }
}
