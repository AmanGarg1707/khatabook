const SCRIPT_URL_KEY = 'scriptUrl'
const QUEUE_KEY = 'syncQueue'
const SHEETS_CACHE_KEY = 'cache_sheets'
const TAGS_CACHE_PREFIX = 'cache_tags_'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export function getScriptUrl() {
  return localStorage.getItem(SCRIPT_URL_KEY) || ''
}

export function setScriptUrl(url) {
  localStorage.setItem(SCRIPT_URL_KEY, url)
}

export function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []
  } catch {
    return []
  }
}

export function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

// Cache helpers — each cache entry: { data, cachedAt }

export function getSheetsCache() {
  try {
    const entry = JSON.parse(localStorage.getItem(SHEETS_CACHE_KEY))
    if (!entry) return null
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null
    return entry.data
  } catch { return null }
}

export function setSheetsCache(sheets) {
  localStorage.setItem(SHEETS_CACHE_KEY, JSON.stringify({ data: sheets, cachedAt: Date.now() }))
}

export function getTagsCache(fyName) {
  try {
    const entry = JSON.parse(localStorage.getItem(TAGS_CACHE_PREFIX + fyName))
    if (!entry) return null
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null
    return entry.data
  } catch { return null }
}

export function setTagsCache(fyName, tags) {
  localStorage.setItem(TAGS_CACHE_PREFIX + fyName, JSON.stringify({ data: tags, cachedAt: Date.now() }))
}

// Pure helper — mirrors getFYName in api.gs, parses yyyy-MM-dd string directly
export function getFYName(dateStr) {
  const parts = dateStr.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1]) - 1 // 0-indexed
  const fyStart = month >= 3 ? year : year - 1
  return `FY ${fyStart}-${String(fyStart + 1).slice(-2)}`
}

// Returns months in a FY as chip objects, newest first, up to current month
// fyName: 'FY 2025-26'
export function fyMonthChips(fyName) {
  const yearMatch = fyName.match(/FY (\d{4})-/)
  if (!yearMatch) return []
  const fyStart = Number(yearMatch[1])
  const now = new Date()
  const months = []
  // Apr fyStart … Mar fyStart+1
  for (let i = 0; i < 12; i++) {
    const month = (3 + i) % 12 // 3=Apr, 4=May … 2=Mar
    const year = i < 9 ? fyStart : fyStart + 1
    const value = `${year}-${String(month + 1).padStart(2, '0')}`
    // Only include months up to current
    if (new Date(year, month, 1) > now) break
    months.push({
      label: new Date(year, month, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      value,
      filter: 'month',
    })
  }
  return months.reverse() // newest first
}

export function currentFYName() {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const fyStart = month >= 3 ? year : year - 1
  return `FY ${fyStart}-${String(fyStart + 1).slice(-2)}`
}
