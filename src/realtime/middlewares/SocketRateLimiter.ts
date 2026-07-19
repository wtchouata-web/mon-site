import { Socket } from "socket.io";
import { CacheService } from "../services/CacheService.js";
import { SocketRateLimitError } from "../errors/index.js";
import { RealtimeLogger } from "../utils/Logger.js";

/**
 * Socket.IO Anti-Abuse and Traffic Policing Engine.
 * Implements token-bucket rate limits per client, spam filters, and custom IP blacklist guards.
 */
export class SocketRateLimiter {
  private static cache = CacheService.getInstance();
  private static MAX_EVENTS_PER_MINUTE = 180; // Peak throughput limit
  private static BLACKLIST_PREFIX = "blacklist:ip:";
  private static RATE_LIMIT_PREFIX = "ratelimit:socket:";

  /**
   * Enforces handshake level IP blacklist lookups
   */
  public static checkBlacklist() {
    return async (socket: Socket, next: (err?: Error) => void) => {
      const ip = socket.handshake.address;
      
      try {
        const isBlacklisted = await this.cache.get<boolean>(`${this.BLACKLIST_PREFIX}${ip}`);
        if (isBlacklisted) {
          RealtimeLogger.warn("Security", `Connection attempt blocked from blacklisted IP: ${ip}`);
          return next(new Error("Accès refusé. Votre adresse IP a été bannie pour comportement abusif."));
        }
        return next();
      } catch (err) {
        // Fallback gracefully on cache failure to maintain uptime
        return next();
      }
    };
  }

  /**
   * Enforces message-level rate limits on active event channels
   */
  public static async enforceRateLimit(socket: Socket): Promise<void> {
    const userId = socket.data.user?.id || socket.id;
    const rateLimitKey = `${this.RATE_LIMIT_PREFIX}${userId}`;

    try {
      const currentHits = await this.cache.incr(rateLimitKey, 60); // 1-minute bucket TTL

      if (currentHits > this.MAX_EVENTS_PER_MINUTE) {
        RealtimeLogger.warn("Security", `Spam flood detected for user ${userId}. Hits: ${currentHits}`, {
          socketId: socket.id,
          ip: socket.handshake.address
        });
        
        // Auto blacklist IP on extreme flooding
        if (currentHits > this.MAX_EVENTS_PER_MINUTE * 2) {
          const ip = socket.handshake.address;
          await this.cache.set(`${this.BLACKLIST_PREFIX}${ip}`, true, 86400); // 24-hour ban
          RealtimeLogger.error("Security", `Auto-banned flooding IP: ${ip} for 24 hours.`);
          socket.disconnect(true);
        }

        throw new SocketRateLimitError("Limite de messages dépassée. Veuillez ralentir votre cadence.");
      }
    } catch (err) {
      if (err instanceof SocketRateLimitError) throw err;
      // Fail open on telemetry hiccups to avoid service disruptions
    }
  }
}
