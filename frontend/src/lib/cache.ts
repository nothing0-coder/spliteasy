// Simple in-memory cache for API responses
// In production, you might want to use Redis or another caching solution

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export const cache = new MemoryCache()

// Cache keys
export const CACHE_KEYS = {
  GROUPS: (userId: string) => `groups:${userId}`,
  GROUP: (groupId: string) => `group:${groupId}`,
  EXPENSES: (groupId: string) => `expenses:${groupId}`,
  BALANCES: (groupId: string) => `balances:${groupId}`,
  ANALYTICS: (groupId: string) => `analytics:${groupId}`,
} as const

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  GROUPS: 2 * 60 * 1000, // 2 minutes
  GROUP: 5 * 60 * 1000, // 5 minutes
  EXPENSES: 1 * 60 * 1000, // 1 minute
  BALANCES: 30 * 1000, // 30 seconds
  ANALYTICS: 5 * 60 * 1000, // 5 minutes
} as const

// Utility function to invalidate related cache entries
export function invalidateGroupCache(groupId: string): void {
  cache.delete(CACHE_KEYS.GROUP(groupId))
  cache.delete(CACHE_KEYS.EXPENSES(groupId))
  cache.delete(CACHE_KEYS.BALANCES(groupId))
  cache.delete(CACHE_KEYS.ANALYTICS(groupId))
}

// Cleanup expired entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    cache.cleanup()
  }, 5 * 60 * 1000)
}
