import { listSheets, listTags } from './api'
import {
  getSheetsCache, setSheetsCache,
  getTagsCache, setTagsCache,
} from './storage'

// Returns sheets from cache if fresh, otherwise fetches and caches.
// Falls back to clientFallback() on error.
export async function getCachedSheets(clientFallback) {
  const cached = getSheetsCache()
  if (cached) return cached
  try {
    const { sheets } = await listSheets()
    setSheetsCache(sheets)
    return sheets
  } catch {
    return clientFallback()
  }
}

// Returns tags for a FY from cache if fresh, otherwise fetches and caches.
// Returns [] on error.
export async function getCachedTags(fyName) {
  const cached = getTagsCache(fyName)
  if (cached) return cached
  try {
    const { tags } = await listTags(fyName)
    setTagsCache(fyName, tags)
    return tags
  } catch {
    return []
  }
}

// Force-refreshes tags for a FY (ignores TTL) and updates the cache.
// Used after adding an expense with new tags.
export async function refreshTagsForFY(fyName) {
  try {
    const { tags } = await listTags(fyName)
    setTagsCache(fyName, tags)
    return tags
  } catch {
    return getTagsCache(fyName) || []
  }
}

// Called once on app launch: primes sheets cache and current-FY tags cache if stale.
export async function primeMetadataCache(currentFYName, clientFallback) {
  await Promise.all([getCachedSheets(clientFallback), getCachedTags(currentFYName)])
}
