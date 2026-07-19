import { Socket, Server } from "socket.io";
import { PayloadValidator } from "../validators/PayloadValidator.js";
import { db } from "../../db/index.js";
import { calls, callLogs } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { RealtimeLogger } from "../utils/Logger.js";

/**
 * Socket Call signaling Manager.
 * Orchestrates WebRTC signaling events, handles calling rooms, rings, and logs metadata.
 */
export class CallManager {
  constructor(private io: Server) {}

  /**
   * Initializes a call signaling session and logs it inside PostgreSQL
   */
  public async handleInitCall(socket: Socket, payload: any): Promise<void> {
    const callerId = socket.data.user?.id;
    if (!callerId) return;

    try {
      PayloadValidator.validateCallInit(payload);

      const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const channelName = `rtc_room_${callId}`;

      // 1. Persist the call record
      const [callRecord] = await db.insert(calls).values({
        id: callId,
        conversationId: payload.conversationId,
        callerId,
        type: payload.type,
        status: "ringing",
        channelName,
        createdAt: new Date()
      }).returning();

      // 2. Direct-emit call invitation to the target recipient
      // Join call signaling room
      const rtcRoom = `rtc_session:${callId}`;
      await socket.join(rtcRoom);

      this.io.emit("call:ringing", {
        callId,
        callerId,
        callerName: socket.data.user?.name || "Un contact",
        recipientId: payload.recipientId,
        type: payload.type,
        channelName
      });

      RealtimeLogger.info("Calls", `Call initialized: ${callId}. Room: ${rtcRoom}. Type: ${payload.type}`);
    } catch (err: any) {
      RealtimeLogger.error("Calls", "Failed to initialize call.", err, { callerId });
      socket.emit("error", {
        event: "call:init_failed",
        message: err.message || "Impossible d'initier l'appel."
      });
    }
  }

  /**
   * Accepts an incoming ringing call
   */
  public async handleAcceptCall(socket: Socket, payload: any): Promise<void> {
    const recipientId = socket.data.user?.id;
    if (!recipientId || !payload.callId) return;

    try {
      const callId = payload.callId;

      await db.transaction(async (tx) => {
        // Update Call status
        await tx.update(calls)
          .set({ status: "ongoing" })
          .where(eq(calls.id, callId));

        // Create log record
        await tx.insert(callLogs).values({
          callId,
          userId: recipientId,
          status: "connected",
          createdAt: new Date()
        });
      });

      const rtcRoom = `rtc_session:${callId}`;
      await socket.join(rtcRoom);

      // Signal back to caller that the call was accepted
      this.io.to(rtcRoom).emit("call:accepted", {
        callId,
        recipientId
      });

      RealtimeLogger.info("Calls", `Call accepted: ${callId} by ${recipientId}`);
    } catch (err: any) {
      RealtimeLogger.error("Calls", "Failed to accept call.", err, { recipientId });
    }
  }

  /**
   * Declines or rejects an incoming ringing call
   */
  public async handleRejectCall(socket: Socket, payload: any): Promise<void> {
    const recipientId = socket.data.user?.id;
    if (!recipientId || !payload.callId) return;

    try {
      const callId = payload.callId;

      await db.transaction(async (tx) => {
        await tx.update(calls)
          .set({ status: "rejected", endedAt: new Date() })
          .where(eq(calls.id, callId));

        await tx.insert(callLogs).values({
          callId,
          userId: recipientId,
          status: "rejected",
          createdAt: new Date()
        });
      });

      const rtcRoom = `rtc_session:${callId}`;
      this.io.to(rtcRoom).emit("call:rejected", {
        callId,
        recipientId
      });

      RealtimeLogger.info("Calls", `Call rejected: ${callId} by ${recipientId}`);
    } catch (err: any) {
      RealtimeLogger.error("Calls", "Failed to reject call.", err, { recipientId });
    }
  }

  /**
   * Relays RTC signaling frames (SDP Offer, SDP Answer, ICE Candidates)
   */
  public handleIceSignal(socket: Socket, payload: any): void {
    const senderId = socket.data.user?.id;
    if (!senderId || !payload.callId) return;

    // Relay WebRTC SDP handshake transparently to the RTC room
    const rtcRoom = `rtc_session:${payload.callId}`;
    socket.to(rtcRoom).emit("call:signal_relayed", {
      callId: payload.callId,
      senderId,
      signalData: payload.signalData
    });

    RealtimeLogger.info("Calls", `Relaying SDP/ICE signal on call ${payload.callId} from ${senderId}`);
  }

  /**
   * Ends an active ongoing call session
   */
  public async handleEndCall(socket: Socket, payload: any): Promise<void> {
    const userId = socket.data.user?.id;
    if (!userId || !payload.callId) return;

    try {
      const callId = payload.callId;

      const callData = await db.select()
        .from(calls)
        .where(eq(calls.id, callId))
        .limit(1);

      if (callData.length > 0) {
        const start = callData[0].createdAt;
        const end = new Date();
        const durationSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));

        await db.transaction(async (tx) => {
          await tx.update(calls)
            .set({ status: "ended", endedAt: end })
            .where(eq(calls.id, callId));

          await tx.insert(callLogs).values({
            callId,
            userId,
            durationSeconds,
            status: "completed",
            createdAt: end
          });
        });

        const rtcRoom = `rtc_session:${callId}`;
        this.io.to(rtcRoom).emit("call:ended", {
          callId,
          durationSeconds
        });

        RealtimeLogger.info("Calls", `Call ended: ${callId}. Duration: ${durationSeconds} seconds.`);
      }
    } catch (err: any) {
      RealtimeLogger.error("Calls", "Failed to terminate call.", err, { userId });
    }
  }
}
