# Khatabook PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React PWA hosted on GitHub Pages that lets family members add and view expenses stored in a Google Sheet via an existing Apps Script backend.

**Architecture:** Vite + React SPA with React Router v6 (3 routes), a `SyncQueueContext` that persists pending expenses to localStorage and syncs them in the background, and a thin `api.js` layer that reads the script URL from localStorage on every call.

**Tech Stack:** Vite, React 18, React Router v6, TailwindCSS v3, vite-plugin-pwa, gh-pages

---

## File Map

| File | Create/Modify | Responsibility |
|---|---|---|
| `scripts/api.gs` | Modify | Add `list_sheets` and `list_tags` actions |
| `package.json` | Create | Vite project deps + scripts |
| `vite.config.js` | Create | Base path, PWA plugin config |
| `index.html` | Create | App entry HTML |
| `public/404.html` | Create | GitHub Pages SPA redirect |
| `src/main.jsx` | Create | React DOM render |
| `src/App.jsx` | Create | BrowserRouter + SyncQueueProvider + routes |
| `src/lib/storage.js` | Create | localStorage get/set helpers + metadata cache (sheets & tags with 24h TTL) |
| `src/lib/api.js` | Create | `apiFetch`, `addExpense`, `listExpenses`, `listSheets`, `listTags` |
| `src/lib/metadataCache.js` | Create | Cache-first wrappers for sheets & tags; fetches on app launch or when cache is stale |
| `src/context/SyncQueueContext.jsx` | Create | Queue state, persistence, background sync loop; refreshes tag cache after successful add if new tags detected |
| `src/components/BottomNav.jsx` | Create | 3-tab nav bar with gradient active state |
| `src/components/PendingQueue.jsx` | Create | Renders pending/syncing/failed items with retry |
| `src/components/FYSelector.jsx` | Create | Dropdown populated from `listSheets` with fallback |
| `src/components/FilterChips.jsx` | Create | Horizontal scrolling single-select chips |
| `src/components/ExpenseList.jsx` | Create | Filtered list rows + empty state |
| `src/pages/AddExpense.jsx` | Create | Form + PendingQueue |
| `src/pages/ViewExpenses.jsx` | Create | Header + chips + ExpenseList |
| `src/pages/Settings.jsx` | Create | URL input + save + warning banner |
| `src/index.css` | Create | Tailwind directives + custom CSS |

---

## Task 1: Apps Script — `list_sheets` and `list_tags`

**Files:**
- Modify: `scripts/api.gs`

- [ ] **Step 1: Add the two new cases to `doPost`**

Open `scripts/api.gs` and update the switch statement:

```js
case 'list_sheets': return listSheets(ss);
case 'list_tags':   return listTags(ss, body);
```

Also fix `listExpenses` so month/tag filters respect the `fyName` sent by the frontend (otherwise filtering a past FY will look in the current FY sheet):

```js
function listExpenses(ss, body) {
  var filter = body.filter;
  var value = body.value;
  var fyName = filter === 'year' ? value : (body.fyName || getCurrentFYName());
  var sheet = ss.getSheetByName(fyName);
  // ... rest unchanged
```

- [ ] **Step 2: Add `listSheets` function**

Append to `scripts/api.gs`:

```js
function listSheets(ss) {
  var sheets = ss.getSheets()
    .map(function(s) { return s.getName(); })
    .filter(function(name) { return /^FY \d{4}-\d{2}$/.test(name); })
    .sort()
    .reverse();
  return jsonResponse({ sheets: sheets });
}
```

- [ ] **Step 3: Add `listTags` function**

Append to `scripts/api.gs`:

```js
function listTags(ss, body) {
  var sheet = ss.getSheetByName(body.fyName);
  if (!sheet) return jsonResponse({ tags: [] });
  var data = sheet.getDataRange().getValues();
  var tagSet = {};
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    String(data[i][4]).split(',').forEach(function(t) {
      var trimmed = t.trim();
      if (trimmed) tagSet[trimmed] = true;
    });
  }
  return jsonResponse({ tags: Object.keys(tagSet).sort() });
}
```

- [ ] **Step 4: Verify manually**

After deploying the updated script, test with curl or Postman:
```bash
curl -L -X POST "YOUR_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"list_sheets"}'
# Expected: {"sheets":["FY 2025-26","FY 2024-25"]}

curl -L -X POST "YOUR_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"list_tags","fyName":"FY 2025-26"}'
# Expected: {"tags":["food","fuel","general"]}
```

---

## Task 2: Scaffold Vite + React project

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/index.css`, `public/404.html`, `.gitignore`

- [ ] **Step 1: Initialise the project**

From `/Users/aman.garg/nykaa/khatabook`:

```bash
npm create vite@latest . -- --template react
```

When prompted "Current directory is not empty. Remove existing files and continue?" — choose **No, keep existing files** (or manually scaffold if needed).

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install react-router-dom
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npm install gh-pages
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js` with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 4: Set up `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .gradient-brand {
    background: linear-gradient(135deg, #6366f1, #a855f7);
  }
  .text-gradient-brand {
    background: linear-gradient(135deg, #6366f1, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}
```

- [ ] **Step 5: Configure `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/khatabook/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Khatabook',
        short_name: 'Khatabook',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/khatabook/',
        icons: [
          { src: '/khatabook/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/khatabook/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

- [ ] **Step 6: Create `public/404.html`** (GitHub Pages SPA redirect)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    var path = window.location.pathname.replace('/khatabook', '') || '/';
    sessionStorage.redirect = path;
    window.location.replace('/khatabook/');
  </script>
</head>
</html>
```

- [ ] **Step 7: Add redirect script to `index.html`** head (before other scripts):

```html
<script>
  (function() {
    var redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect !== window.location.pathname) {
      window.history.replaceState(null, null, redirect);
    }
  })();
</script>
```

- [ ] **Step 8: Add deploy script to `package.json`**

Add to `"scripts"`:
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

- [ ] **Step 9: Commit scaffold**

```bash
git add -A
git commit -m "feat: scaffold Vite+React PWA project"
```

---

## Task 3: `src/lib/storage.js` — localStorage helpers

**Files:**
- Create: `src/lib/storage.js`

- [ ] **Step 1: Write `storage.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage.js
git commit -m "feat: add localStorage helpers with metadata cache"
```

---

## Task 4: `src/lib/api.js` — API layer

**Files:**
- Create: `src/lib/api.js`

- [ ] **Step 1: Write `api.js`**

```js
import { getScriptUrl } from './storage'

async function apiFetch(body) {
  const url = getScriptUrl()
  if (!url) throw new Error('No script URL configured')
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export function addExpense({ date, name, amount, tags }) {
  return apiFetch({ action: 'add', date, name, amount, tags })
}

export function listExpenses({ filter, value, fyName }) {
  return apiFetch({ action: 'list', filter, value, fyName })
}

export function listSheets() {
  return apiFetch({ action: 'list_sheets' })
}

export function listTags(fyName) {
  return apiFetch({ action: 'list_tags', fyName })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: add API layer"
```

---

## Task 4b: `src/lib/metadataCache.js` — cache-first metadata fetching

**Files:**
- Create: `src/lib/metadataCache.js`

- [ ] **Step 1: Write `metadataCache.js`**

```js
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
  await getCachedSheets(clientFallback)
  await getCachedTags(currentFYName)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/metadataCache.js
git commit -m "feat: add metadataCache with 24h TTL and force-refresh"
```

---

## Task 5: `SyncQueueContext` — queue state and sync loop

**Files:**
- Create: `src/context/SyncQueueContext.jsx`

- [ ] **Step 1: Write `SyncQueueContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { loadQueue, saveQueue, getTagsCache, getFYName } from '../lib/storage'
import { addExpense } from '../lib/api'
import { refreshTagsForFY } from '../lib/metadataCache'

const SyncQueueContext = createContext(null)

export function SyncQueueProvider({ children }) {
  const [queue, setQueue] = useState(() => loadQueue())

  // Persist on every change
  useEffect(() => {
    saveQueue(queue)
  }, [queue])

  // Background sync loop
  useEffect(() => {
    const pending = queue.filter(item => item.status === 'pending')
    if (pending.length === 0) return

    // Mark all pending → syncing
    setQueue(q =>
      q.map(item =>
        item.status === 'pending' ? { ...item, status: 'syncing' } : item
      )
    )

    pending.forEach(item => {
      addExpense({ date: item.date, name: item.name, amount: item.amount, tags: item.tags })
        .then(() => {
          setQueue(q => q.filter(i => i.localId !== item.localId))
          // If expense has tags not already in cache, refresh tags for that FY in background
          const fyName = getFYName(item.date)
          const cachedTags = getTagsCache(fyName) || []
          const hasNewTag = item.tags.some(t => !cachedTags.includes(t))
          if (hasNewTag) refreshTagsForFY(fyName)
        })
        .catch(() => {
          setQueue(q =>
            q.map(i =>
              i.localId === item.localId ? { ...i, status: 'failed' } : i
            )
          )
        })
    })
  }, [queue.filter(i => i.status === 'pending').length]) // eslint-disable-line react-hooks/exhaustive-deps

  function enqueue({ date, name, amount, tags }) {
    const item = {
      localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date, name, amount, tags,
      status: 'pending',
    }
    setQueue(q => [...q, item])
  }

  function retry(localId) {
    setQueue(q =>
      q.map(item =>
        item.localId === localId ? { ...item, status: 'pending' } : item
      )
    )
  }

  return (
    <SyncQueueContext.Provider value={{ queue, enqueue, retry }}>
      {children}
    </SyncQueueContext.Provider>
  )
}

export function useSyncQueue() {
  return useContext(SyncQueueContext)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/context/SyncQueueContext.jsx
git commit -m "feat: add SyncQueueContext with background sync loop"
```

---

## Task 6: `App.jsx` and `src/main.jsx` — routing shell

**Files:**
- Create: `src/App.jsx`, `src/main.jsx`

- [ ] **Step 1: Write `src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/khatabook">
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 2: Write `src/App.jsx`**

```jsx
import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { SyncQueueProvider } from './context/SyncQueueContext'
import { primeMetadataCache } from './lib/metadataCache'
import { currentFYName } from './lib/storage'
import AddExpense from './pages/AddExpense'
import ViewExpenses from './pages/ViewExpenses'
import Settings from './pages/Settings'

function clientFallbackFYs() {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const fyStart = month >= 3 ? year : year - 1
  return Array.from({ length: 4 }, (_, i) => {
    const s = fyStart - i
    return `FY ${s}-${String(s + 1).slice(-2)}`
  })
}

export default function App() {
  // Prime sheets + current-FY tags cache on every app launch (respects 24h TTL)
  useEffect(() => {
    primeMetadataCache(currentFYName(), clientFallbackFYs)
  }, [])

  return (
    <SyncQueueProvider>
      <Routes>
        <Route path="/" element={<AddExpense />} />
        <Route path="/view" element={<ViewExpenses />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </SyncQueueProvider>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/main.jsx
git commit -m "feat: add routing shell"
```

---

## Task 7: `BottomNav` component

**Files:**
- Create: `src/components/BottomNav.jsx`

- [ ] **Step 1: Write `BottomNav.jsx`**

```jsx
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Add', icon: '➕' },
  { to: '/view', label: 'View', icon: '📋' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-gray-100 bg-white">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-indigo-500' : 'text-gray-400'
            }`
          }
        >
          <span className="mb-0.5 text-lg">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BottomNav.jsx
git commit -m "feat: add BottomNav component"
```

---

## Task 8: `PendingQueue` component

**Files:**
- Create: `src/components/PendingQueue.jsx`

- [ ] **Step 1: Write `PendingQueue.jsx`**

```jsx
import { useSyncQueue } from '../context/SyncQueueContext'

export default function PendingQueue() {
  const { queue, retry } = useSyncQueue()
  if (queue.length === 0) return null

  return (
    <div className="mx-4 mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        Pending Sync
      </p>
      <ul className="space-y-2">
        {queue.map(item => (
          <li
            key={item.localId}
            className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-gray-700">{item.name}</p>
              <p className="text-[11px] text-gray-400">
                ₹{Number(item.amount).toFixed(2)} · {item.date}
              </p>
            </div>
            {item.status === 'syncing' && (
              <span className="animate-spin text-indigo-500">⟳</span>
            )}
            {item.status === 'pending' && (
              <span className="text-[11px] text-gray-400">waiting…</span>
            )}
            {item.status === 'failed' && (
              <button
                onClick={() => retry(item.localId)}
                className="rounded-md bg-red-50 px-2 py-1 text-[11px] font-medium text-red-500 border border-red-100"
              >
                ↺ Retry
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PendingQueue.jsx
git commit -m "feat: add PendingQueue component"
```

---

## Task 9: `AddExpense` page

**Files:**
- Create: `src/pages/AddExpense.jsx`

- [ ] **Step 1: Write `AddExpense.jsx`**

```jsx
import { useState } from 'react'
import { useSyncQueue } from '../context/SyncQueueContext'
import BottomNav from '../components/BottomNav'
import PendingQueue from '../components/PendingQueue'

function todayISO() {
  return new Date().toLocaleDateString('en-CA') // yyyy-MM-dd in local time
}

export default function AddExpense() {
  const { enqueue } = useSyncQueue()
  const [date, setDate] = useState(todayISO)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [tags, setTags] = useState(['general'])
  const [tagInput, setTagInput] = useState('')

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  function removeTag(tag) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !amount) return
    enqueue({ date, name: name.trim(), amount: Number(amount), tags })
    setName('')
    setAmount('')
    setTags(['general'])
    setTagInput('')
  }

  return (
    <div className="flex min-h-screen flex-col bg-white pb-16">
      {/* Header */}
      <div className="gradient-brand px-4 pb-5 pt-10">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200">
          Khatabook
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Add Expense</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Groceries"
            required
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Amount (₹)
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            required
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="gradient-brand flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-white"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 text-indigo-200 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder="+ tag"
              className="min-w-[60px] flex-1 bg-transparent text-[11px] text-gray-600 placeholder-gray-300 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="gradient-brand w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 active:opacity-90"
        >
          Add Expense
        </button>
      </form>

      <PendingQueue />
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Run the dev server and verify the page renders**

```bash
npm run dev
```

Open `http://localhost:5173/khatabook/`. You should see the Add Expense form with a gradient header, all fields, and a tag chip input.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AddExpense.jsx
git commit -m "feat: add AddExpense page"
```

---

## Task 10: `FYSelector` component

**Files:**
- Create: `src/components/FYSelector.jsx`

- [ ] **Step 1: Write `FYSelector.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { getCachedSheets } from '../lib/metadataCache'
import { currentFYName } from '../lib/storage'

function clientFallbackFYs() {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const fyStart = month >= 3 ? year : year - 1
  return Array.from({ length: 4 }, (_, i) => {
    const s = fyStart - i
    return `FY ${s}-${String(s + 1).slice(-2)}`
  })
}

export default function FYSelector({ value, onChange }) {
  const [options, setOptions] = useState([])

  useEffect(() => {
    getCachedSheets(clientFallbackFYs).then(setOptions)
  }, [])

  if (options.length === 0) return null

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold text-white focus:outline-none"
    >
      {options.map(fy => (
        <option key={fy} value={fy} className="text-gray-800">
          {fy}
        </option>
      ))}
    </select>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FYSelector.jsx
git commit -m "feat: add FYSelector component with API + fallback"
```

---

## Task 11: `FilterChips` component

**Files:**
- Create: `src/components/FilterChips.jsx`

- [ ] **Step 1: Write `FilterChips.jsx`**

```jsx
export default function FilterChips({ chips, active, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
      {chips.map(chip => (
        <button
          key={chip.value}
          onClick={() => onSelect(chip)}
          className={`flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
            active === chip.value
              ? 'gradient-brand text-white'
              : 'border border-gray-200 bg-gray-50 text-gray-500'
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
```

Each `chip` is `{ label: string, value: string, filter: 'month' | 'tag' }`.

- [ ] **Step 2: Commit**

```bash
git add src/components/FilterChips.jsx
git commit -m "feat: add FilterChips component"
```

---

## Task 12: `ExpenseList` component

**Files:**
- Create: `src/components/ExpenseList.jsx`

- [ ] **Step 1: Write `ExpenseList.jsx`**

```jsx
export default function ExpenseList({ expenses, total, loading, onRefresh, error }) {
  return (
    <div className="flex-1 px-4">
      {/* Total + refresh row */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Filtered Total
          </p>
          <p className="text-xl font-bold text-gray-800">
            ₹{Number(total || 0).toLocaleString('en-IN')}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="gradient-brand rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {loading ? '⟳' : '⟳ Refresh'}
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-500">{error}</p>
      )}

      {!loading && expenses.length === 0 && !error && (
        <p className="py-8 text-center text-sm text-gray-400">No expenses for this period</p>
      )}

      <ul className="space-y-0 divide-y divide-gray-50">
        {expenses.map(expense => (
          <li key={expense.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">{expense.name}</p>
              <p className="text-[11px] text-gray-400">
                {expense.date.slice(8)}{' '}
                {new Date(expense.date).toLocaleString('en-IN', { month: 'short' })}
                {' · '}
                <span className="text-purple-500">{expense.tags.join(', ')}</span>
              </p>
            </div>
            <p className="font-semibold text-indigo-500">
              ₹{Number(expense.amount).toLocaleString('en-IN')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ExpenseList.jsx
git commit -m "feat: add ExpenseList component"
```

---

## Task 13: `ViewExpenses` page

**Files:**
- Create: `src/pages/ViewExpenses.jsx`

- [ ] **Step 1: Write helpers used by the page**

Add to `src/lib/storage.js`:

```js
// Returns months in a FY as { label, value } chips
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
```

- [ ] **Step 2: Write `ViewExpenses.jsx`**

```jsx
import { useCallback, useEffect, useState } from 'react'
import { listExpenses } from '../lib/api'
import { getCachedTags } from '../lib/metadataCache'
import { currentFYName, fyMonthChips } from '../lib/storage'
import BottomNav from '../components/BottomNav'
import FYSelector from '../components/FYSelector'
import FilterChips from '../components/FilterChips'
import ExpenseList from '../components/ExpenseList'

export default function ViewExpenses() {
  const [fy, setFY] = useState(currentFYName)
  const [yearTotal, setYearTotal] = useState(0)
  const [tagChips, setTagChips] = useState([])
  const [activeChip, setActiveChip] = useState(null) // { value, filter }
  const [expenses, setExpenses] = useState([])
  const [filteredTotal, setFilteredTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Derive month chips from current FY
  const monthChips = fyMonthChips(fy)

  // Default chip = current month (first in monthChips since they're newest-first)
  const defaultChip = monthChips[0] || null

  const fetchExpenses = useCallback(async (chip, fyName) => {
    setLoading(true)
    setError(null)
    try {
      const data = await listExpenses({
        filter: chip.filter,
        value: chip.value,
        fyName,
      })
      setExpenses(data.expenses)
      setFilteredTotal(data.filteredTotal)
      setYearTotal(data.yearTotal)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // On FY change: load tags (cache-first) + expenses for default month
  useEffect(() => {
    getCachedTags(fy).then(tags =>
      setTagChips(tags.map(t => ({ label: t, value: t, filter: 'tag' })))
    )

    const chip = fyMonthChips(fy)[0]
    if (chip) {
      setActiveChip(chip)
      fetchExpenses(chip, fy)
    }
  }, [fy, fetchExpenses])

  function handleChipSelect(chip) {
    setActiveChip(chip)
    fetchExpenses(chip, fy)
  }

  const allChips = [...monthChips, ...tagChips]

  return (
    <div className="flex min-h-screen flex-col bg-white pb-16">
      {/* Header */}
      <div className="gradient-brand px-4 pb-5 pt-10">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-indigo-200">
          Financial Year
        </p>
        <div className="flex items-center justify-between">
          <FYSelector value={fy} onChange={setFY} />
          <div className="text-right">
            <p className="text-[10px] text-indigo-200">Year total</p>
            <p className="text-xl font-bold text-white">
              ₹{Number(yearTotal).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <FilterChips
        chips={allChips}
        active={activeChip?.value}
        onSelect={handleChipSelect}
      />
      <div className="border-b border-gray-100" />

      {/* Expense list */}
      <div className="flex-1 pt-4">
        <ExpenseList
          expenses={expenses}
          total={filteredTotal}
          loading={loading}
          onRefresh={() => activeChip && fetchExpenses(activeChip, fy)}
          error={error}
        />
      </div>

      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 3: Test in browser**

Navigate to `http://localhost:5173/khatabook/view`. With a configured script URL you should see the FY selector, month chips, and expense list. Without a URL you should see the error state.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ViewExpenses.jsx src/lib/storage.js
git commit -m "feat: add ViewExpenses page"
```

---

## Task 14: `Settings` page

**Files:**
- Create: `src/pages/Settings.jsx`

- [ ] **Step 1: Write `Settings.jsx`**

```jsx
import { useState } from 'react'
import { getScriptUrl, setScriptUrl } from '../lib/storage'
import { useSyncQueue } from '../context/SyncQueueContext'
import BottomNav from '../components/BottomNav'

export default function Settings() {
  const [url, setUrl] = useState(getScriptUrl)
  const [saved, setSaved] = useState(false)
  const { retry, queue } = useSyncQueue()

  function handleSave(e) {
    e.preventDefault()
    setScriptUrl(url.trim())
    // Retry all failed items now that we have a URL
    queue
      .filter(item => item.status === 'failed')
      .forEach(item => retry(item.localId))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white pb-16">
      {/* Header */}
      <div className="gradient-brand px-4 pb-5 pt-10">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200">
          Khatabook
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Settings</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4 p-4">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Apps Script URL
          </label>
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setSaved(false) }}
            placeholder="https://script.google.com/macros/s/…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <button
          type="submit"
          className="gradient-brand w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 active:opacity-90"
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>

        {!url.trim() && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-semibold text-yellow-800">⚠ No URL configured</p>
            <p className="mt-1 text-xs text-yellow-700">
              Paste your Apps Script web app URL above to enable expense syncing.
            </p>
          </div>
        )}
      </form>

      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Settings.jsx
git commit -m "feat: add Settings page"
```

---

## Task 15: PWA icons

**Files:**
- Create: `public/icon-192.png`, `public/icon-512.png`

- [ ] **Step 1: Create a simple SVG icon and export to PNG**

Create `public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#g)"/>
  <text x="50" y="68" font-size="52" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold">₹</text>
</svg>
```

Convert to PNG (requires `sharp` or any image tool):

```bash
npx sharp-cli --input public/icon.svg --output public/icon-192.png --width 192 --height 192
npx sharp-cli --input public/icon.svg --output public/icon-512.png --width 512 --height 512
```

If `sharp-cli` is unavailable, use any SVG→PNG converter (e.g. Inkscape, ImageMagick, or an online tool) to produce `192×192` and `512×512` PNGs.

- [ ] **Step 2: Commit**

```bash
git add public/icon.svg public/icon-192.png public/icon-512.png
git commit -m "feat: add PWA icons"
```

---

## Task 16: End-to-end smoke test + deploy

**Files:**
- No new files

- [ ] **Step 1: Run full dev smoke test**

```bash
npm run dev
```

Walk through:
1. Open `/khatabook/` — Add Expense form loads
2. Add an expense — appears in Pending Queue with syncing state
3. Navigate to `/khatabook/view` — FY selector and month chips load; expenses list
4. Navigate to `/khatabook/settings` — warning banner shows if no URL set; saving URL clears it

- [ ] **Step 2: Build for production**

```bash
npm run build
```

Expected: no errors, `dist/` folder created.

- [ ] **Step 3: Preview production build locally**

```bash
npm run preview
```

Verify all 3 routes work at the preview URL.

- [ ] **Step 4: Deploy to GitHub Pages**

```bash
npm run deploy
```

This runs `vite build` then pushes `dist/` to the `gh-pages` branch. Confirm the site is live at `https://<your-username>.github.io/khatabook/`.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Khatabook PWA complete"
```
