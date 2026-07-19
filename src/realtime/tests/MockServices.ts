import { Socket } from "socket.io";
import { UserPresence, UserPresenceStatus, NotificationPayload } from "../types/index.js";
import { INotificationProvider } from "../interfaces/INotificationProvider.js";

/**
 * Mock Socket.IO Client Connection simulator.
 * Highly functional for unit tests, enabling message simulation, handshake mocking, and event capture.
 */
export class MockSocket {
  public id: string;
  public data: Record<string, any> = {};
  public handshake: any;
  public rooms = new Set<string>();
  public sentEvents = new Map<string, any[]>();
  public broadcastEvents = new Map<string, any[]>();

  constructor(id = "mock_socket_id", userId = "mock_user_1", role = "user") {
    this.id = id;
    this.data = {
      user: {
        id: userId,
        name: "Mocked User",
        role,
        email: "mocked@roseamour.com"
      }
    };
    this.handshake = {
      address: "127.0.0.1",
      auth: { token: "mocked_jwt_token" },
      query: {},
      headers: { "user-agent": "MockTester-Client" }
    };
  }

  public emit(event: string, ...args: any[]): boolean {
    const existing = this.sentEvents.get(event) || [];
    existing.push(args);
    this.sentEvents.set(event, existing);
    return true;
  }

  public to(room: string) {
    return {
      emit: (event: string, ...args: any[]) => {
        const key = `room:${room}:${event}`;
        const existing = this.broadcastEvents.get(key) || [];
        existing.push(args);
        this.broadcastEvents.set(key, existing);
        return true;
      }
    };
  }

  public async join(room: string): Promise<void> {
    this.rooms.add(room);
  }

  public async leave(room: string): Promise<void> {
    this.rooms.delete(room);
  }

  /**
   * Clears accumulated event buffers
   */
  public reset(): void {
    this.sentEvents.clear();
    this.broadcastEvents.clear();
    this.rooms.clear();
  }
}

/**
 * Mock Multi-Channel Notification Provider.
 * Captures outgoing alerts without writing network frames to Twilio, Firebase or SendGrid.
 */
export class MockNotification implements INotificationProvider {
  public deliveredNotifications: NotificationPayload[] = [];
  public failNext = false;

  constructor(private channel: "push" | "email" | "sms" | "whatsapp" | "internal" = "push") {}

  public getChannel() {
    return this.channel;
  }

  public async send(payload: NotificationPayload): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
    if (this.failNext) {
      return { success: false, error: "Mock injection delivery error" };
    }

    this.deliveredNotifications.push(payload);
    return {
      success: true,
      providerMessageId: `mock_provider_id_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`
    };
  }

  public clear(): void {
    this.deliveredNotifications = [];
    this.failNext = false;
  }
}

/**
 * Mock Presence State tracker.
 * Mocks DB calls for extremely fast client testing.
 */
export class MockPresence {
  private localStates = new Map<string, UserPresence>();

  public async setPresence(userId: string, status: UserPresenceStatus, customMessage?: string): Promise<UserPresence> {
    const updated: UserPresence = {
      userId,
      status,
      lastSeen: new Date(),
      customMessage
    };
    this.localStates.set(userId, updated);
    return updated;
  }

  public async getPresence(userId: string): Promise<UserPresence | null> {
    return this.localStates.get(userId) || null;
  }

  public clear(): void {
    this.localStates.clear();
  }
}
