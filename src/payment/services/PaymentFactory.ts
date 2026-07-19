import { PaymentProvider } from "../interfaces/PaymentProvider.js";
import { CinetPayProvider } from "../providers/CinetPayProvider.js";
import { PaymentProviderName } from "../types/index.js";
import { ConfigurationError } from "../errors/index.js";

export class PaymentFactory {
  private static providers: Map<PaymentProviderName, PaymentProvider> = new Map();

  static {
    // Lazy or static initialization of available payment providers
    this.registerProvider(new CinetPayProvider());
  }

  /**
   * Registers a new PaymentProvider dynamically
   */
  public static registerProvider(provider: PaymentProvider): void {
    this.providers.set(provider.getName(), provider);
  }

  /**
   * Factory method to fetch the requested PaymentProvider by name
   */
  public static getProvider(name: PaymentProviderName): PaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ConfigurationError(`Le fournisseur de paiement "${name}" n'est pas enregistré dans le moteur.`);
    }
    return provider;
  }

  /**
   * Gets a list of all registered provider names
   */
  public static getRegisteredProviders(): PaymentProviderName[] {
    return Array.from(this.providers.keys());
  }
}
