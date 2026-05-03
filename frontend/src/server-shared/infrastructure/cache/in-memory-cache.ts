interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function isCacheDisabled(): boolean {
  const flag = process.env.DISABLE_CACHE;
  if (!flag) return false;
  const v = flag.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export class InMemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlMs: number, maxEntries = 500) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  get(key: string): T | undefined {
    if (isCacheDisabled()) return undefined;

    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    if (isCacheDisabled()) return;

    // Evict expired entries if we're at capacity
    if (this.store.size >= this.maxEntries) {
      this.evictExpired();
    }
    // If still at capacity, drop the oldest entry
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Build a cache key from lat/lon coordinates.
 * Rounds to ~10m precision by default (4 decimal places).
 */
export function buildGeoKey(lat: number, lon: number, precision = 4): string {
  return `${lat.toFixed(precision)},${lon.toFixed(precision)}`;
}
