import { ICacheService } from "../interfaces/ICacheService.js";

/**
 * Robust modular Cache Service.
 * Transparently falls back to safe high-speed memory maps in development,
 * fully prepared for Redis client integration.
 */
export class CacheService implements ICacheService {
  private static instance: CacheService;
  private localStore = new Map<string, { value: any; expiry: number | null }>();

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public async get<T>(key: string): Promise<T | null> {
    const item = this.localStore.get(key);
    if (!item) return null;

    if (item.expiry && item.expiry < Date.now()) {
      this.localStore.delete(key);
      return null;
    }

    return item.value as T;
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.localStore.set(key, { value, expiry });
  }

  public async del(key: string): Promise<void> {
    this.localStore.delete(key);
  }

  public async exists(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  public async incr(key: string, ttlSeconds?: number): Promise<number> {
    const existing = await this.get<number>(key);
    const newVal = (existing || 0) + 1;
    await this.set(key, newVal, ttlSeconds);
    return newVal;
  }

  /**
   * Resets local storage - ideal for test fixtures
   */
  public clearAll(): void {
    this.localStore.clear();
  }
}
