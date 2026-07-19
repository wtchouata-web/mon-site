import { Socket, Server } from "socket.io";
import { PresenceService } from "../services/PresenceService.js";
import { UserPresenceStatus } from "../types/index.js";
import { RealtimeLogger } from "../utils/Logger.js";
import { MonitoringService } from "../services/MonitoringService.js";

/**
 * Socket Presence Manager.
 * Orchestrates connection Handshakes, active state transitions, and real-time broadcast streams.
 */
export class PresenceManager {
  private presenceService = PresenceService.getInstance();
  private monitoring = MonitoringService.getInstance();
  private activeConnections = new Map<string, Set<string>>(); // userId -> Set of socketIds (supports multi-device)

  constructor(private io: Server) {}

  /**
   * Tracks active socket on connection
   */
  public async handleConnect(socket: Socket): Promise<void> {
    const userId = socket.data.user?.id;
    if (!userId) return;

    let userSockets = this.activeConnections.get(userId);
    if (!userSockets) {
      userSockets = new Set<string>();
      this.activeConnections.set(userId, userSockets);
    }
    userSockets.add(socket.id);

    // Record gauge metrics
    this.monitoring.recordGauge("active_sockets_count", this.io.engine.clientsCount);
    this.monitoring.recordGauge("unique_online_users", this.activeConnections.size);

    // Transition state to ONLINE in DB/Cache
    const presenceInfo = await this.presenceService.setPresence(userId, "ONLINE");

    // Broadcast presence to all other sockets
    socket.broadcast.emit("presence:updated", {
      userId,
      status: "ONLINE",
      lastSeen: presenceInfo.lastSeen
    });

    RealtimeLogger.info("Presence", `User ${userId} came ONLINE. Devices connected: ${userSockets.size}`);
  }

  /**
   * Handles user custom manual status overrides (e.g. BUSY, AWAY, INVISIBLE)
   */
  public async handleStatusChange(socket: Socket, status: UserPresenceStatus, customMessage?: string): Promise<void> {
    const userId = socket.data.user?.id;
    if (!userId) return;

    const presenceInfo = await this.presenceService.setPresence(userId, status, customMessage);

    // Broadcast update
    this.io.emit("presence:updated", {
      userId,
      status,
      lastSeen: presenceInfo.lastSeen,
      customMessage
    });

    RealtimeLogger.info("Presence", `User ${userId} changed status to: ${status}`);
  }

  /**
   * Handles device socket disconnection
   */
  public async handleDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.user?.id;
    if (!userId) return;

    const userSockets = this.activeConnections.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        // Last active device disconnected, mark as completely offline
        this.activeConnections.delete(userId);
        
        const presenceInfo = await this.presenceService.setPresence(userId, "OFFLINE");

        this.io.emit("presence:updated", {
          userId,
          status: "OFFLINE",
          lastSeen: presenceInfo.lastSeen
        });

        RealtimeLogger.info("Presence", `User ${userId} went OFFLINE.`);
      } else {
        RealtimeLogger.info("Presence", `User ${userId} disconnected a device. Active devices: ${userSockets.size}`);
      }
    }

    this.monitoring.recordGauge("active_sockets_count", this.io.engine.clientsCount);
    this.monitoring.recordGauge("unique_online_users", this.activeConnections.size);
  }

  /**
   * Checks if a user has any active sockets
   */
  public isUserOnline(userId: string): boolean {
    const sockets = this.activeConnections.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }
}
