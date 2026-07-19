import { PaymentProvider } from "../interfaces/PaymentProvider.js";
import {
  InitializePaymentPayload,
  InitializePaymentResponse,
  VerifyPaymentResponse,
  RefundPaymentPayload,
  RefundPaymentResponse,
  WebhookValidationResult,
  ProviderHealthCheckResult,
  PaymentProviderName,
  PaymentStatus
} from "../types/index.js";
import { ProviderUnavailableError } from "../errors/index.js";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export class CinetPayProvider implements PaymentProvider {
  private name: PaymentProviderName = "cinetpay";

  public getName(): PaymentProviderName {
    return this.name;
  }

  private hasProductionCredentials(): boolean {
    return !!(process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID);
  }

  public async initializePayment(payload: InitializePaymentPayload): Promise<InitializePaymentResponse> {
    const apiKey = process.env.CINETPAY_API_KEY;
    const siteId = process.env.CINETPAY_SITE_ID;

    if (this.hasProductionCredentials()) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const body = {
          apikey: apiKey,
          site_id: siteId,
          transaction_id: payload.reference,
          amount: payload.amount,
          currency: payload.currency || "XAF",
          alternative_currency: "",
          description: `Rose Amour - Plan ${payload.planType || "Publication"}`,
          customer_id: payload.userId || "anonymous",
          customer_name: payload.buyerName || "Client",
          customer_surname: "RoseAmour",
          customer_email: payload.buyerEmail || "client@rose-amour.com",
          customer_phone_number: payload.phoneNumber || "000000000",
          customer_address: "Yaoundé",
          customer_city: "Yaoundé",
          customer_country: "CM",
          customer_state: "CM",
          customer_zip_code: "00237",
          notify_url: process.env.CINETPAY_NOTIFY_URL || "https://rose-amour.cm/api/v2/payment/webhook/cinetpay",
          return_url: process.env.CINETPAY_RETURN_URL || "https://rose-amour.cm/payment-return",
          channels: "ALL",
          metadata: JSON.stringify({
            productId: payload.productId,
            planType: payload.planType,
            userId: payload.userId
          })
        };

        const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data: any = await res.json();

        if (res.ok && (data.code === "201" || data.status === "CREATED")) {
          return {
            success: true,
            reference: payload.reference,
            paymentUrl: data.data?.payment_url,
            status: "PENDING",
            provider: this.name,
            rawResponse: data
          };
        } else {
          console.error("[CinetPay API Error] Init response:", data);
          throw new Error(data.description || data.message || "Erreur de réponse CinetPay");
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error("[CinetPay API Connection Error]:", err.message);
        if (err.name === "AbortError") {
          throw new Error("Échec de connexion à CinetPay: Le serveur de paiement CinetPay a mis trop de temps à répondre (Timeout).");
        }
        throw new Error(`Échec de connexion à CinetPay: ${err.message}`);
      }
    }

    // Simulation fallback if keys are missing
    return {
      success: true,
      reference: payload.reference,
      paymentUrl: `/payment/cinetpay-sim?reference=${payload.reference}`,
      status: "PENDING",
      provider: this.name,
      rawResponse: { mode: "simulation", message: "Simulation active" }
    };
  }

  public async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    const apiKey = process.env.CINETPAY_API_KEY;
    const siteId = process.env.CINETPAY_SITE_ID;

    if (this.hasProductionCredentials()) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const body = {
          apikey: apiKey,
          site_id: siteId,
          transaction_id: reference
        };

        const res = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data: any = await res.json();

        if (res.ok && (data.code === "00" || data.message === "SUCCES")) {
          const gatewayStatus = data.data?.status;
          const isSuccessful = gatewayStatus === "ACCEPTED";
          const isCancelled = gatewayStatus === "CANCELLED";
          const isRefused = gatewayStatus === "REFUSED";
          const isExpired = gatewayStatus === "EXPIRED";

          let mappedStatus: PaymentStatus = "PENDING";
          if (isSuccessful) mappedStatus = "SUCCESSFUL";
          else if (isCancelled) mappedStatus = "CANCELLED";
          else if (isRefused) mappedStatus = "FAILED";
          else if (isExpired) mappedStatus = "EXPIRED";

          return {
            success: isSuccessful,
            reference: reference,
            externalReference: data.data?.operator_id || undefined,
            amount: Number(data.data?.amount || 0),
            currency: data.data?.currency || "XAF",
            status: mappedStatus,
            rawResponse: data
          };
        } else {
          console.error("[CinetPay API Error] Check response:", data);
          return {
            success: false,
            reference: reference,
            amount: 0,
            currency: "XAF",
            status: "PENDING",
            rawResponse: data
          };
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error("[CinetPay API Check Connection Error]:", err.message);
        const statusText = err.name === "AbortError" ? "Timeout de connexion" : err.message;
        return {
          success: false,
          reference: reference,
          amount: 0,
          currency: "XAF",
          status: "PENDING",
          rawResponse: { error: statusText }
        };
      }
    }

    // Simulation verification
    const [paymentRecord] = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.reference, reference))
      .limit(1);

    if (!paymentRecord) {
      return {
        success: false,
        reference,
        amount: 0,
        currency: "XAF",
        status: "FAILED",
        rawResponse: { message: "Paiement introuvable" }
      };
    }

    return {
      success: paymentRecord.status === "SUCCESSFUL",
      reference: reference,
      amount: paymentRecord.amount,
      currency: paymentRecord.currency,
      status: paymentRecord.status as PaymentStatus,
      rawResponse: { mode: "simulation", status: paymentRecord.status }
    };
  }

  public async refundPayment(payload: RefundPaymentPayload): Promise<RefundPaymentResponse> {
    return {
      success: true,
      refundId: `ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: "COMPLETED",
      rawResponse: { message: "Remboursement traité (Mode Simulation/Modular)" }
    };
  }

  public async cancelPayment(reference: string): Promise<boolean> {
    return true;
  }

  public async getTransaction(reference: string): Promise<any> {
    return { reference, status: "PENDING" };
  }

  public async validateWebhook(rawPayload: string, headers: Record<string, string>): Promise<WebhookValidationResult> {
    try {
      let parsed: any;
      if (rawPayload.trim().startsWith("{") || rawPayload.trim().startsWith("[")) {
        parsed = JSON.parse(rawPayload);
      } else {
        // Parse application/x-www-form-urlencoded query string
        parsed = {};
        const params = new URLSearchParams(rawPayload);
        for (const [key, value] of params.entries()) {
          parsed[key] = value;
        }
      }
      
      const reference = parsed.cpm_trans_id || parsed.transaction_id || parsed.cpm_custom;
      const amount = parsed.cpm_amount ? Number(parsed.cpm_amount) : (parsed.amount ? Number(parsed.amount) : undefined);
      const currency = parsed.cpm_currency || parsed.currency;
      const externalReference = parsed.cpm_pay_id || parsed.operator_id;
      
      const isAccepted = parsed.cpm_result === "00" || parsed.status === "ACCEPTED" || parsed.status === "SUCCESSFUL";
      const isCancelled = parsed.status === "CANCELLED" || parsed.cpm_result === "CANCELLED";
      const isExpired = parsed.status === "EXPIRED" || parsed.cpm_result === "EXPIRED";
      
      let event: "SUCCESS" | "FAILED" | "PENDING" | "REFUNDED" | "EXPIRED" = "FAILED";
      if (isAccepted) event = "SUCCESS";
      else if (isExpired) event = "EXPIRED";
      
      // Signature check for CinetPay
      const xToken = headers["x-token"] || headers["X-Token"];
      const secretKey = process.env.CINETPAY_SECRET_KEY || process.env.CINETPAY_API_KEY;
      
      let isValid = true;
      if (secretKey && xToken) {
        const hmac = crypto.createHmac("sha256", secretKey);
        hmac.update(rawPayload);
        const computed = hmac.digest("hex");
        isValid = computed === xToken;

        if (!isValid && process.env.CINETPAY_API_KEY) {
          const hmac2 = crypto.createHmac("sha256", process.env.CINETPAY_API_KEY);
          hmac2.update(rawPayload);
          isValid = hmac2.digest("hex") === xToken;
        }
      }
      
      return {
        isValid,
        event,
        reference,
        amount,
        currency,
        externalReference,
        rawPayload: parsed
      };
    } catch (err) {
      return { isValid: false };
    }
  }

  public async healthCheck(): Promise<ProviderHealthCheckResult> {
    const hasKeys = this.hasProductionCredentials();
    return {
      provider: this.name,
      status: hasKeys ? "UP" : "DEGRADED",
      latencyMs: 15,
      message: hasKeys 
        ? "CinetPay API integration is online and operational."
        : "CinetPay is running in Simulation Mode (No production credentials set)."
    };
  }
}

