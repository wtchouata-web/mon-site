import { NotificationPayload, NotificationChannel } from "../types/index.js";

export interface INotificationProvider {
  /**
   * The communication channel identifying this provider
   */
  getChannel(): NotificationChannel;

  /**
   * Executes multi-recipient delivery for SMS, Push Alerts, or WhatsApp templates
   */
  send(payload: NotificationPayload): Promise<{ success: boolean; providerMessageId?: string; error?: string }>;
}
