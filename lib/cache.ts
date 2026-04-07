// Simple in-memory stale-while-revalidate cache.
// Data is served instantly from cache on revisit, then refreshed in background.

interface CacheEntry<T> {
  data: T
  ts: number
}

const store = new Map<string, CacheEntry<unknown>>()
const TTL = 30_000 // 30 seconds

export function getCache<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.ts > TTL) return null
  return entry.data
}

export function setCache<T>(key: string, data: T) {
  store.set(key, { data, ts: Date.now() })
}

export function invalidateCache(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
