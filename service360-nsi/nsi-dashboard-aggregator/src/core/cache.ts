interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class TtlCache<T> {
  private readonly storage = new Map<string, CacheEntry<T>>()

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | null {
    const entry = this.storage.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.storage.delete(key)
      return null
    }
    return entry.value
  }

  set(key: string, value: T): void {
    this.storage.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  async getOrSet(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.get(key)
    if (cached !== null) {
      return cached
    }

    const fresh = await factory()
    this.set(key, fresh)
    return fresh
  }

  clear(): void {
    this.storage.clear()
  }
}
