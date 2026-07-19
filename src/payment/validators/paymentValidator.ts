import { InitializePaymentPayload } from "../types/index.js";
import { PaymentError } from "../errors/index.js";

export class PaymentValidator {
  private static supportedCurrencies = ["XAF", "XOF", "EUR", "USD"];

  /**
   * Validates incoming payment payload parameters
   */
  public static validateInitializationPayload(payload: InitializePaymentPayload): void {
    if (!payload.reference || payload.reference.trim() === "") {
      throw new PaymentError("La référence de paiement est obligatoire.", "VALIDATION_ERROR", 400);
    }

    if (typeof payload.amount !== "number" || payload.amount <= 0) {
      throw new PaymentError("Le montant de la transaction doit être un nombre positif.", "VALIDATION_ERROR", 400);
    }

    if (!payload.currency || !this.supportedCurrencies.includes(payload.currency.toUpperCase())) {
      throw new PaymentError(
        `La devise "${payload.currency}" n'est pas prise en charge. Devises acceptées : ${this.supportedCurrencies.join(", ")}.`,
        "VALIDATION_ERROR",
        400
      );
    }

    if (!payload.paymentMethod || payload.paymentMethod.trim() === "") {
      throw new PaymentError("Le mode de paiement est obligatoire.", "VALIDATION_ERROR", 400);
    }

    // If mobile payment is specified, validate phone format
    if (["orange_money", "mtn_money"].includes(payload.paymentMethod.toLowerCase())) {
      if (!payload.phoneNumber || payload.phoneNumber.trim() === "") {
        throw new PaymentError(
          "Le numéro de téléphone est obligatoire pour les paiements Mobile Money.",
          "VALIDATION_ERROR",
          400
        );
      }
      
      const cleanPhone = payload.phoneNumber.replace(/[\s+]/g, "");
      if (!/^\d{8,15}$/.test(cleanPhone)) {
        throw new PaymentError(
          "Format du numéro de téléphone mobile money invalide. Doit contenir entre 8 et 15 chiffres.",
          "VALIDATION_ERROR",
          400
        );
      }
    }
  }
}
