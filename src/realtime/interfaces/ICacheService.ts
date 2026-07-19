export interface ICacheService {
  /**
   * Gets a value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Sets a value inside cache with TTL
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Deletes a key
   */
  del(key: string): Promise<void>;

  /**
   * Checks key existence
   */
  exists(key: string): Promise<boolean>;

  /**
   * Increments a key for rate-limiting
   */
  incr(key: string, ttlSeconds?: number): Promise<number>;
}
