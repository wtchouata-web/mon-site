import { db } from "../../db/index.js";
import * as schema from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { PaymentFactory } from "../services/PaymentFactory.js";
import { PaymentService } from "../services/PaymentService.js";
import { WebhookVerificationError, TransactionFailedError } from "../errors/index.js";
import { IdempotencyManager } from "../utils/IdempotencyManager.js";
import { PaymentProviderName } from "../types/index.js";

export class WebhookHandler {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Generically handles webhooks from any registered provider.
   * Performs signature checking, idempotency checks, raw logging, and triggers database transaction updates.
   */
  public async handleWebhook(
    providerName: PaymentProviderName,
    rawPayload: string,
    headers: Record<string, string>,
    context: { ipAddress?: string } = {}
  ): Promise<{ success: boolean; message: string }> {
    const provider = PaymentFactory.getProvider(providerName);

    // 1. Core Signature Validation Check
    const validation = await provider.validateWebhook(rawPayload, headers);
    if (!validation.isValid || !validation.reference) {
      throw new WebhookVerificationError(
        `Échec de la validation de la signature du webhook pour le fournisseur : "${providerName}".`
      );
    }

    // 2. Extract Webhook Idempotency Key (usually from headers or payload IDs)
    const idempotencyKey =
      headers["idempotency-key"] ||
      headers["Idempotency-Key"] ||
      validation.rawPayload?.idempotency_key ||
      validation.rawPayload?.id ||
      `wh_key_${validation.reference}_${validation.event}`;

    // 3. Replay Protection - Ensure this webhook is not processed multiple times
    const replayCheck = await IdempotencyManager.checkKeys(idempotencyKey);
    if (replayCheck.exists && replayCheck.status === "PROCESSED") {
      return {
        success: true,
        message: `Webhook "${idempotencyKey}" déjà traité avec succès par le passé (sans re-opération).`
      };
    }

    // 4. Record raw webhook record inside database (Audit Trail & Tracking)
    const whRecordId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    return await db.transaction(async (tx) => {
      try {
        // Log raw webhook inside SQL
        await tx.insert(schema.webhooks).values({
          id: whRecordId,
          provider: providerName,
          idempotencyKey,
          payload: rawPayload,
          signature: headers["x-mock-signature"] || headers["signature"] || "mock-sig",
          status: "PENDING",
          createdAt: new Date()
        });

        // 5. Update associated payment status based on verification
        const paymentReference = validation.reference!;
        const [targetPayment] = await tx
          .select()
          .from(schema.payments)
          .where(eq(schema.payments.reference, paymentReference))
          .limit(1);

        if (!targetPayment) {
          throw new WebhookVerificationError(`Aucun enregistrement de paiement trouvé pour la référence : "${paymentReference}"`);
        }

        // If target payment is already successful, do not down-grade it
        if (targetPayment.status !== "SUCCESSFUL") {
          let updatedStatus: any = "PENDING";
          if (validation.event === "SUCCESS") updatedStatus = "SUCCESSFUL";
          if (validation.event === "FAILED") updatedStatus = "FAILED";
          if (validation.event === "EXPIRED") updatedStatus = "EXPIRED";
          if (validation.event === "REFUNDED") updatedStatus = "REFUNDED";

          // Perform full upgrade flow utilizing the core service
          // By calling verifyPayment internally or writing the specific mutations
          if (updatedStatus === "SUCCESSFUL") {
            // Re-verify with payment service to execute subscriptions and invoices creation
            await this.paymentService.verifyPayment(paymentReference, {
              ipAddress: context.ipAddress,
              userId: targetPayment.userId || undefined
            });
          } else {
            await tx
              .update(schema.payments)
              .set({
                status: updatedStatus,
                externalReference: validation.externalReference || null,
                rawResponse: JSON.stringify(validation.rawPayload),
                updatedAt: new Date()
              })
              .where(eq(schema.payments.id, targetPayment.id));
          }
        }

        // Mark webhook as PROCESSED successfully
        await tx
          .update(schema.webhooks)
          .set({
            status: "PROCESSED"
          })
          .where(eq(schema.webhooks.id, whRecordId));

        return {
          success: true,
          message: `Webhook ${idempotencyKey} traité avec succès.`
        };
      } catch (err: any) {
        console.error(`[Rose Amour Webhook Handler Error] Webhook processing failed:`, err);
        // Mark webhook as FAILED
        await tx
          .update(schema.webhooks)
          .set({
            status: "FAILED"
          })
          .where(eq(schema.webhooks.id, whRecordId));

        throw new TransactionFailedError(`La transaction du webhook a échoué : ${err.message}`);
      }
    });
  }
}
