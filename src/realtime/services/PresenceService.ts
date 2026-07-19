import { db } from "../../db/index.js";
import { presence } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { UserPresence, UserPresenceStatus } from "../types/index.js";
import { CacheService } from "./CacheService.js";

/**
 * High-Scale User Presence Coordinator.
 * Manages active status streams and syncs cache layers with persistent PostgreSQL tables.
 */
export class PresenceService {
  private static instance: PresenceService;
  private cache = CacheService.getInstance();
  private CACHE_PREFIX = "presence:user:";

  private constructor() {}

  public static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  /**
   * Updates a user's presence state with database synchronization
   */
  public async setPresence(
    userId: string,
    status: UserPresenceStatus,
    customMessage?: string
  ): Promise<UserPresence> {
    const updatedModel: UserPresence = {
      userId,
      status,
      lastSeen: new Date(),
      customMessage
    };

    // 1. Sync Cache
    await this.cache.set(`${this.CACHE_PREFIX}${userId}`, updatedModel, 3600); // 1 hour TTL for active presence

    // 2. Sync PostgreSQL (Upsert pattern via Drizzle transaction)
    await db.transaction(async (tx) => {
      const existing = await tx.select()
        .from(presence)
        .where(eq(presence.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        await tx.update(presence)
          .set({
            status,
            lastSeen: updatedModel.lastSeen,
            customMessage: customMessage || existing[0].customMessage || null,
            updatedAt: new Date()
          })
          .where(eq(presence.userId, userId));
      } else {
        await tx.insert(presence).values({
          userId,
          status,
          lastSeen: updatedModel.lastSeen,
          customMessage: customMessage || null,
          updatedAt: new Date()
        });
      }
    });

    return updatedModel;
  }

  /**
   * Retrieves a user's presence, resolving from cache or falling back to database
   */
  public async getPresence(userId: string): Promise<UserPresence | null> {
    // Attempt cache read
    const cached = await this.cache.get<UserPresence>(`${this.CACHE_PREFIX}${userId}`);
    if (cached) {
      return {
        ...cached,
        lastSeen: new Date(cached.lastSeen) // parse date correctly
      };
    }

    // Database lookup fallback
    const dbRow = await db.select()
      .from(presence)
      .where(eq(presence.userId, userId))
      .limit(1);

    if (dbRow.length === 0) {
      return null;
    }

    const value: UserPresence = {
      userId: dbRow[0].userId,
      status: dbRow[0].status as UserPresenceStatus,
      lastSeen: dbRow[0].lastSeen,
      customMessage: dbRow[0].customMessage || undefined
    };

    // Warm cache
    await this.cache.set(`${this.CACHE_PREFIX}${userId}`, value, 3600);

    return value;
  }

  /**
   * Sets user as completely offline on disconnection
   */
  public async handleDisconnect(userId: string): Promise<void> {
    await this.setPresence(userId, "OFFLINE");
  }
}
