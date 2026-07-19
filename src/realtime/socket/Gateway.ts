import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { SocketAuthMiddleware } from "../middlewares/SocketAuthMiddleware.js";
import { SocketRateLimiter } from "../middlewares/SocketRateLimiter.js";
import { PresenceManager } from "../presence/PresenceManager.js";
import { RoomManager } from "../rooms/RoomManager.js";
import { MessageManager } from "../messages/MessageManager.js";
import { TypingManager } from "../typing/TypingManager.js";
import { CallManager } from "../calls/CallManager.js";
import { RealtimeLogger } from "../utils/Logger.js";

/**
 * Socket.IO Real-Time Gateway Hub.
 * Completely decoupled from Express. Initializes the Socket.IO Server,
 * wires up security layers, and delegates packet flows to specialized sub-managers.
 */
export class Gateway {
  private static instance: Gateway;
  private io!: Server;

  // Managers
  private presenceManager!: PresenceManager;
  private roomManager!: RoomManager;
  private messageManager!: MessageManager;
  private typingManager!: TypingManager;
  private callManager!: CallManager;

  private constructor() {}

  public static getInstance(): Gateway {
    if (!Gateway.instance) {
      Gateway.instance = new Gateway();
    }
    return Gateway.instance;
  }

  /**
   * Boots the Socket.IO Server on top of the provided Node HTTP Server instance
   */
  public initialize(httpServer: HttpServer): Server {
    if (this.io) {
      RealtimeLogger.warn("Gateway", "Socket.IO Server is already initialized.");
      return this.io;
    }

    RealtimeLogger.info("Gateway", "Booting up modular real-time Socket.IO engine...");

    // Initialize Server with secure CORS controls
    this.io = new Server(httpServer, {
      cors: {
        origin: "*", // Matches multi-environment deployments
        methods: ["GET", "POST"],
        credentials: true
      },
      pingInterval: 10000,
      pingTimeout: 20000,
      maxHttpBufferSize: 1e6 // 1MB packet constraint
    });

    // 1. Register Hands-shake Security Middleware
    this.io.use(SocketRateLimiter.checkBlacklist());
    this.io.use(SocketAuthMiddleware.authenticate());

    // 2. Initialize Specialized Sub-Managers
    this.presenceManager = new PresenceManager(this.io);
    this.roomManager = new RoomManager();
    this.messageManager = new MessageManager(this.io);
    this.typingManager = new TypingManager(this.io);
    this.callManager = new CallManager(this.io);

    // 3. Register Event Routing Pipelines
    this.registerEventRoutes();

    RealtimeLogger.info("Gateway", "Real-time Gateway fully online and operational.");
    return this.io;
  }

  /**
   * Retrieves the current active Socket.IO server instance
   */
  public getIo(): Server {
    if (!this.io) {
      throw new Error("Socket.IO has not been initialized. Please call initialize() first.");
    }
    return this.io;
  }

  private registerEventRoutes(): void {
    this.io.on("connection", async (socket: Socket) => {
      const userId = socket.data.user?.id;
      RealtimeLogger.info("Gateway", `New Socket Connection established: ${socket.id} (User: ${userId})`);

      // A. Presence Lifecycle
      await this.presenceManager.handleConnect(socket);

      // B. Manual Status Changes
      socket.on("presence:set_status", async (data: { status: any; customMessage?: string }) => {
        await this.presenceManager.handleStatusChange(socket, data.status, data.customMessage);
      });

      // C. Chat Rooms Management
      socket.on("room:join", async (data: { conversationId: string }, callback?: (res: any) => void) => {
        try {
          await this.roomManager.joinConversation(socket, data.conversationId);
          if (callback) callback({ success: true });
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      });

      socket.on("room:leave", async (data: { conversationId: string }, callback?: (res: any) => void) => {
        try {
          await this.roomManager.leaveConversation(socket, data.conversationId);
          if (callback) callback({ success: true });
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      });

      // D. Messagerie Events
      socket.on("message:send", async (data: any) => {
        await this.messageManager.handleSendMessage(socket, data);
      });

      socket.on("message:receipt", async (data: any) => {
        await this.messageManager.handleMessageReceipt(socket, data);
      });

      // E. Typing Indicators
      socket.on("typing:update", async (data: any) => {
        await this.typingManager.handleTyping(socket, data);
      });

      // F. Calling (RTC Signal Control)
      socket.on("call:initiate", async (data: any) => {
        await this.callManager.handleInitCall(socket, data);
      });

      socket.on("call:accept", async (data: any) => {
        await this.callManager.handleAcceptCall(socket, data);
      });

      socket.on("call:reject", async (data: any) => {
        await this.callManager.handleRejectCall(socket, data);
      });

      socket.on("call:signal_send", (data: any) => {
        this.callManager.handleIceSignal(socket, data);
      });

      socket.on("call:end", async (data: any) => {
        await this.callManager.handleEndCall(socket, data);
      });

      // G. Connection Cleanup / Offline Syncs
      socket.on("disconnect", async () => {
        RealtimeLogger.info("Gateway", `Socket disconnected: ${socket.id} (User: ${userId})`);
        await this.presenceManager.handleDisconnect(socket);
      });
    });
  }
}
export default Gateway;
