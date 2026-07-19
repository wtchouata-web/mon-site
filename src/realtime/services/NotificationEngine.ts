import { INotificationProvider } from "../interfaces/INotificationProvider.js";
import { NotificationPayload, NotificationChannel } from "../types/index.js";
import { db } from "../../db/index.js";
import { notificationQueue, notifications } from "../../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Enterprise Multi-Channel Notification Dispatcher.
 * Leverages structured delivery provider contracts for transactional notifications.
 */
export class NotificationEngine {
  private static instance: NotificationEngine;
  private providers = new Map<NotificationChannel, INotificationProvider>();

  private constructor() {
    this.registerDefaultMockProviders();
  }

  public static getInstance(): NotificationEngine {
    if (!NotificationEngine.instance) {
      NotificationEngine.instance = new NotificationEngine();
    }
    return NotificationEngine.instance;
  }

  public registerProvider(provider: INotificationProvider): void {
    this.providers.set(provider.getChannel(), provider);
  }

  /**
   * Routes a notification request across multiple target channels.
   * Leverages background logging and DB queue persistence.
   */
  public async dispatch(payload: NotificationPayload): Promise<void> {
    const promises = payload.channels.map(async (channel) => {
      // 1. Persist initial state inside the database queue table
      let queueItem;
      try {
        const [inserted] = await db.insert(notificationQueue).values({
          userId: payload.userId,
          title: payload.title,
          content: payload.content,
          channel: channel,
          status: "pending",
          attempts: 0
        }).returning();
        queueItem = inserted;
      } catch (dbErr) {
        console.error("[Notification Engine] Failed to queue item in database:", dbErr);
      }

      // 2. Resolve target channel provider
      const provider = this.providers.get(channel);
      if (!provider) {
        console.warn(`[Notification Engine] No registered provider for channel: ${channel}`);
        if (queueItem) {
          await db.update(notificationQueue)
            .set({ status: "failed", errorMessage: `No registered provider for ${channel}`, updatedAt: new Date() })
            .where(eq(notificationQueue.id, queueItem.id));
        }
        return;
      }

      // 3. Dispatch the alert
      try {
        if (queueItem) {
          await db.update(notificationQueue)
            .set({ attempts: queueItem.attempts + 1, updatedAt: new Date() })
            .where(eq(notificationQueue.id, queueItem.id));
        }

        const result = await provider.send(payload);

        if (result.success) {
          if (queueItem) {
            await db.update(notificationQueue)
              .set({ status: "sent", updatedAt: new Date() })
              .where(eq(notificationQueue.id, queueItem.id));
          }
        } else {
          throw new Error(result.error || "Unknown provider failure");
        }
      } catch (err: any) {
        console.error(`[Notification Engine] Delivery failed on channel ${channel}:`, err.message);
        if (queueItem) {
          await db.update(notificationQueue)
            .set({ status: "failed", errorMessage: err.message, updatedAt: new Date() })
            .where(eq(notificationQueue.id, queueItem.id));
        }
      }
    });

    // Run parallel dispatches non-blockingly
    Promise.all(promises).catch((err) => {
      console.error("[Notification Engine] Fatal dispatch loop failure:", err);
    });
  }

  private registerDefaultMockProviders(): void {
    // SMS Channel
    this.registerProvider({
      getChannel: () => "sms",
      send: async (payload) => {
        console.log(`[SMS Provider] SMS text routed to User ${payload.userId}: [${payload.title}] - ${payload.content}`);
        return { success: true, providerMessageId: `sms_msg_${Date.now()}` };
      }
    });

    // WhatsApp Channel
    this.registerProvider({
      getChannel: () => "whatsapp",
      send: async (payload) => {
        console.log(`[WhatsApp Provider] Sending WA Template message to User ${payload.userId}: [${payload.title}]`);
        return { success: true, providerMessageId: `wa_msg_${Date.now()}` };
      }
    });

    // Email Channel
    this.registerProvider({
      getChannel: () => "email",
      send: async (payload) => {
        console.log(`[Email Provider] Sending HTML payload to User ${payload.userId}: <${payload.title}>`);
        return { success: true, providerMessageId: `email_msg_${Date.now()}` };
      }
    });

    // Mobile Push Notifications (FCM Mock)
    this.registerProvider({
      getChannel: () => "push",
      send: async (payload) => {
        console.log(`[Push Provider] Sending FCM push token to User ${payload.userId}: ${payload.title}`);
        return { success: true, providerMessageId: `fcm_msg_${Date.now()}` };
      }
    });

    // Internal In-App Feed Notification (Writes to existing DB 'notifications' table)
    this.registerProvider({
      getChannel: () => "internal",
      send: async (payload) => {
        await db.insert(notifications).values({
          userId: payload.userId,
          title: payload.title,
          content: payload.content,
          isRead: false
        });
        return { success: true, providerMessageId: `db_notif_${Date.now()}` };
      }
    });
  }
}
