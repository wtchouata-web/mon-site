import { db } from "../../db/index.js";
import * as schema from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { IdempotencyError } from "../errors/index.js";

export class IdempotencyManager {
  /**
   * Checks if an idempotency key is already registered in the system (either for webhooks or checkouts).
   * Returns the existing payment/webhook status if already processed.
   */
  public static async checkKeys(key: string): Promise<{ exists: boolean; status?: string }> {
    if (!key) return { exists: false };

    // 1. Check in payments table
    const existingPayments = await db
      .select({ id: schema.payments.id, status: schema.payments.status })
      .from(schema.payments)
      .where(eq(schema.payments.idempotencyKey, key))
      .limit(1);

    if (existingPayments.length > 0) {
      return { exists: true, status: existingPayments[0].status };
    }

    // 2. Check in webhooks table
    const existingWebhooks = await db
      .select({ id: schema.webhooks.id, status: schema.webhooks.status })
      .from(schema.webhooks)
      .where(eq(schema.webhooks.idempotencyKey, key))
      .limit(1);

    if (existingWebhooks.length > 0) {
      return { exists: true, status: existingWebhooks[0].status };
    }

    return { exists: false };
  }

  /**
   * Enforces and locks a request with an idempotency key. Throws if there's a collision.
   */
  public static async enforceIdempotency(key: string): Promise<void> {
    const check = await this.checkKeys(key);
    if (check.exists) {
      throw new IdempotencyError(
        `Violation d'idempotence détectée. La clé d'idempotence "${key}" a déjà été traitée (Statut: ${check.status}).`,
        { idempotencyKey: key, status: check.status }
      );
    }
  }
}
