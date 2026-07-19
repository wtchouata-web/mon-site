import { db } from "../../db/index.js";
import * as schema from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { PaymentFactory } from "./PaymentFactory.js";
import { IdempotencyManager } from "../utils/IdempotencyManager.js";
import {
  InitializePaymentPayload,
  InitializePaymentResponse,
  VerifyPaymentResponse,
  RefundPaymentPayload,
  RefundPaymentResponse,
  PaymentProviderName,
  PaymentStatus,
  InvoiceBillingInfo
} from "../types/index.js";
import { PaymentError, TransactionFailedError } from "../errors/index.js";

export class PaymentService {
  /**
   * Initializes a payment session dynamically resolving the provider
   */
  public async initializePayment(
    providerName: PaymentProviderName,
    payload: InitializePaymentPayload,
    context: { ipAddress?: string; userId?: string } = {}
  ): Promise<InitializePaymentResponse> {
    const startTime = Date.now();
    const provider = PaymentFactory.getProvider(providerName);

    // 1. Enforce Idempotency Security
    if (payload.idempotencyKey) {
      await IdempotencyManager.enforceIdempotency(payload.idempotencyKey);
    }

    return await db.transaction(async (tx) => {
      try {
        // 2. Write a PENDING payment record to secure transaction footprint
        const [paymentRecord] = await tx
          .insert(schema.payments)
          .values({
            reference: payload.reference,
            productId: payload.productId || null,
            userId: payload.userId || context.userId || null,
            amount: payload.amount,
            currency: payload.currency || "XAF",
            phoneNumber: payload.phoneNumber || null,
            paymentMethod: payload.paymentMethod,
            status: "PENDING",
            planType: payload.planType || null,
            provider: providerName,
            idempotencyKey: payload.idempotencyKey || null,
            rawResponse: "INITIALIZING"
          })
          .returning();

        // 3. Initiate checkout via resolved provider
        const response = await provider.initializePayment(payload);

        // 4. Update with gateway's initial feedback
        await tx
          .update(schema.payments)
          .set({
            status: response.status,
            rawResponse: response.rawResponse ? JSON.stringify(response.rawResponse) : "INITIALIZED",
            updatedAt: new Date()
          })
          .where(eq(schema.payments.id, paymentRecord.id));

        // 5. Audit Trail log write
        await tx.insert(schema.paymentLogs).values({
          paymentId: paymentRecord.id,
          userId: payload.userId || context.userId || null,
          ipAddress: context.ipAddress || "0.0.0.0",
          amount: payload.amount,
          currency: payload.currency || "XAF",
          provider: providerName,
          status: response.status,
          responseTimeMs: Date.now() - startTime,
          returnCode: response.success ? "INIT_SUCCESS_00" : "INIT_ERR_01"
        });

        return response;
      } catch (err: any) {
        // Rollback log tracking
        console.error(`[Rose Amour Payment Service] Failed initialization for reference ${payload.reference}:`, err);
        throw new TransactionFailedError(
          `Échec de l'initialisation de la transaction : ${err.message}`,
          { originalError: err.message }
        );
      }
    });
  }

  /**
   * Verifies payment status and completes full business state updates (subscriptions, invoices, activation)
   */
  public async verifyPayment(
    reference: string,
    context: { ipAddress?: string; userId?: string } = {}
  ): Promise<VerifyPaymentResponse> {
    const startTime = Date.now();

    // 1. Fetch current payment details
    const existingPayments = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.reference, reference))
      .limit(1);

    const payment = existingPayments[0];
    if (!payment) {
      throw new PaymentError(`Paiement introuvable pour la référence : "${reference}"`, "PAYMENT_NOT_FOUND", 404);
    }

    // Resolve specific provider
    const provider = PaymentFactory.getProvider(payment.provider as PaymentProviderName);

    // 2. Query provider API for state confirmation
    const verification = await provider.verifyPayment(reference);

    // If status didn't evolve, just return current state
    if (verification.status === payment.status && payment.status !== "PENDING") {
      return verification;
    }

    // 3. Atomic processing of payment success or failure
    return await db.transaction(async (tx) => {
      try {
        // Check if double processing is avoided (Anti double payment)
        const [reFetchedPayment] = await tx
          .select()
          .from(schema.payments)
          .where(eq(schema.payments.id, payment.id))
          .limit(1);

        if (reFetchedPayment.status === "SUCCESSFUL") {
          return {
            success: true,
            reference: reFetchedPayment.reference,
            externalReference: reFetchedPayment.externalReference || undefined,
            amount: reFetchedPayment.amount,
            currency: reFetchedPayment.currency,
            status: "SUCCESSFUL"
          };
        }

        // Update payment record status
        await tx
          .update(schema.payments)
          .set({
            status: verification.status,
            externalReference: verification.externalReference || null,
            rawResponse: verification.rawResponse ? JSON.stringify(verification.rawResponse) : null,
            updatedAt: new Date()
          })
          .where(eq(schema.payments.id, payment.id));

        // If payment was verified successfully, activate plans/subscriptions & invoices
        if (verification.status === "SUCCESSFUL") {
          const userId = payment.userId || context.userId || "anonymous";

          // A. Premium or Boost Activation
          if (payment.planType) {
            const startDate = new Date();
            const endDate = new Date();
            // Determine validity duration
            let durationDays = 30; // Monthly subscription default
            if (payment.planType === "boost") durationDays = 7;
            if (payment.planType === "premium") durationDays = 30;
            if (payment.planType === "annual") durationDays = 365;

            endDate.setDate(startDate.getDate() + durationDays);

            // Insert active subscription
            await tx.insert(schema.subscriptions).values({
              id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              userId,
              planType: payment.planType,
              status: "ACTIVE",
              startDate,
              endDate,
              createdAt: new Date()
            });

            // If a specific product was paid for (e.g., Hostess/Product boost status)
            if (payment.productId) {
              await tx
                .update(schema.products)
                .set({
                  isBoosted: true,
                  boostExpiry: endDate,
                  planType: payment.planType,
                  paymentConfirmed: true,
                  updatedAt: new Date()
                })
                .where(eq(schema.products.id, payment.productId));
            }
          }

          // B. Generate Invoice Blueprint
          const invoiceNumber = `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
          const metadata: InvoiceBillingInfo = {
            billingName: context.userId ? `Utilisateur ${context.userId}` : "Client Rose Amour",
            billingEmail: "client@rose-amour.com",
            items: [
              {
                description: `Paiement pour service ${payment.planType || "Abonnement/Boost"}`,
                quantity: 1,
                unitPrice: payment.amount,
                totalPrice: payment.amount
              }
            ]
          };

          await tx.insert(schema.invoices).values({
            id: `inv_${Date.now()}`,
            userId,
            paymentId: payment.id,
            invoiceNumber,
            amount: payment.amount,
            currency: payment.currency,
            status: "PAID",
            metadata: JSON.stringify(metadata),
            createdAt: new Date()
          });

          // C. Generate User Sales History (Historique Utilisateur)
          let productTitle = "Abonnement/Boost Rose Amour";
          let buyerName = "Client Rose Amour";
          let buyerEmail = "client@rose-amour.com";

          if (payment.productId) {
            const [product] = await tx
              .select()
              .from(schema.products)
              .where(eq(schema.products.id, payment.productId))
              .limit(1);
            if (product) {
              productTitle = product.title;
            }
          }

          if (payment.userId && payment.userId !== "anonymous") {
            const [user] = await tx
              .select()
              .from(schema.users)
              .where(eq(schema.users.id, payment.userId))
              .limit(1);
            if (user) {
              buyerName = user.name || user.email || buyerName;
              buyerEmail = user.email || buyerEmail;
            }
          }

          await tx.insert(schema.sales).values({
            id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            productId: payment.productId,
            productTitle,
            buyerName,
            buyerEmail,
            customerName: buyerName,
            customerEmail: buyerEmail,
            amount: payment.amount,
            feeType: payment.planType === "boost" ? "boost_fee" : "list_fee",
            paymentMethod: payment.paymentMethod || "cinetpay",
            provider: payment.provider,
            status: "completed",
            createdAt: new Date()
          });

          // D. Create Notification inside Database
          if (payment.userId && payment.userId !== "anonymous") {
            await tx.insert(schema.notifications).values({
              userId: payment.userId,
              title: "Paiement Confirmé 🎉",
              content: `Votre paiement de ${payment.amount} ${payment.currency} pour le plan "${payment.planType || "Publication"}" a été traité avec succès.`,
              isRead: false,
              createdAt: new Date()
            });
          }
        }

        // E. Log verification trace in audit logs
        await tx.insert(schema.paymentLogs).values({
          paymentId: payment.id,
          userId: payment.userId || context.userId || null,
          ipAddress: context.ipAddress || "0.0.0.0",
          amount: payment.amount,
          currency: payment.currency,
          provider: payment.provider,
          status: verification.status,
          responseTimeMs: Date.now() - startTime,
          returnCode: verification.success ? "VERIFY_SUCCESS_00" : "VERIFY_PEND_01"
        });

        return verification;
      } catch (err: any) {
        console.error(`[Rose Amour Payment Service] Verification crash for reference ${reference}:`, err);
        throw new TransactionFailedError(
          `La transaction de mise à jour de statut a échoué : ${err.message}`
        );
      }
    });
  }

  /**
   * Processes a refund securely on the gateway and logs refund details
   */
  public async refundPayment(
    paymentId: number,
    amount: number,
    reason: string,
    context: { ipAddress?: string; userId?: string } = {}
  ): Promise<RefundPaymentResponse> {
    const startTime = Date.now();

    // 1. Find target payment
    const paymentsFound = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, paymentId))
      .limit(1);

    const payment = paymentsFound[0];
    if (!payment) {
      throw new PaymentError(`Règlement ID ${paymentId} introuvable`, "REFUND_TARGET_NOT_FOUND", 404);
    }

    if (payment.status !== "SUCCESSFUL") {
      throw new PaymentError("Seuls les règlements confirmés peuvent être remboursés.", "INVALID_REFUND_STATE");
    }

    if (amount > payment.amount) {
      throw new PaymentError("Le montant du remboursement ne peut pas dépasser le règlement initial.", "REFUND_AMOUNT_LIMIT");
    }

    const provider = PaymentFactory.getProvider(payment.provider as PaymentProviderName);

    // 2. Initialize refund on target gateway
    const refundRes = await provider.refundPayment({
      paymentId: payment.id,
      reference: payment.reference,
      amount,
      reason
    });

    // 3. Atomically write refund trail to database
    return await db.transaction(async (tx) => {
      await tx.insert(schema.refunds).values({
        id: refundRes.refundId,
        paymentId: payment.id,
        amount,
        reason,
        status: refundRes.status,
        createdAt: new Date()
      });

      // Update payment record to status REFUNDED or partial
      await tx
        .update(schema.payments)
        .set({
          status: "REFUNDED",
          rawResponse: JSON.stringify(refundRes.rawResponse || "REFUNDED"),
          updatedAt: new Date()
        })
        .where(eq(schema.payments.id, payment.id));

      // Log refund action
      await tx.insert(schema.paymentLogs).values({
        paymentId: payment.id,
        userId: context.userId || payment.userId || null,
        ipAddress: context.ipAddress || "0.0.0.0",
        amount: -amount, // Negative represent refunds
        currency: payment.currency,
        provider: payment.provider,
        status: "REFUNDED",
        responseTimeMs: Date.now() - startTime,
        returnCode: "REFUND_COMPLETED_00"
      });

      return refundRes;
    });
  }

  /**
   * PDF invoicing metadata generator (Prepares billing templates for printing)
   */
  public async getInvoiceDetails(invoiceId: string): Promise<{ invoice: any; billingInfo: InvoiceBillingInfo }> {
    const invoicesFound = await db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, invoiceId))
      .limit(1);

    const invoice = invoicesFound[0];
    if (!invoice) {
      throw new PaymentError(`Facture "${invoiceId}" introuvable`, "INVOICE_NOT_FOUND", 404);
    }

    const billingInfo: InvoiceBillingInfo = invoice.metadata
      ? JSON.parse(invoice.metadata)
      : {
          billingName: "Client Rose Amour",
          billingEmail: "client@rose-amour.com",
          items: []
        };

    return {
      invoice,
      billingInfo
    };
  }

  /**
   * Fetches active user subscriptions
   */
  public async getUserSubscriptions(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, userId))
      .orderBy(desc(schema.subscriptions.createdAt));
  }
}
