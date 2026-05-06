# Khatabook PWA — Design Spec

**Date:** 2026-04-27

## Overview

A React PWA hosted on GitHub Pages. Backend is an existing Google Apps Script web app deployed over a Google Sheet. The app is shared with family members who all write to the same sheet.

---

## Stack

- **Vite + React** (JSX)
- **TailwindCSS** for styling
- **React Router v6** — three routes, base path configured for GitHub Pages (`/khatabook/`)
- **vite-plugin-pwa** — service worker + web manifest for installability
- **gh-pages** npm package for deployment

---

## Visual Style

White base with indigo→purple gradient accents (cards, buttons, active states, header bars). Consistent with "Option C" agreed during brainstorm.

---

## Pages & Routing

| Route | Component | Notes |
|---|---|---|
| `/` | `AddExpense` | Default landing page |
| `/view` | `ViewExpenses` | |
| `/settings` | `Settings` | |

Bottom navigation bar present on all pages. Active tab highlighted with gradient color.

---

## File Structure

```
src/
  main.jsx
  App.jsx                    # BrowserRouter + SyncQueueProvider wrapper
  context/
    SyncQueueContext.jsx      # Queue state, localStorage persistence, background sync loop
  pages/
    AddExpense.jsx
    ViewExpenses.jsx
    Settings.jsx
  components/
    BottomNav.jsx
    PendingQueue.jsx          # Pending/syncing/failed list shown below add form
    ExpenseList.jsx
    FilterChips.jsx
    FYSelector.jsx
  lib/
    api.js                   # All fetch calls to Apps Script; reads URL from localStorage
    storage.js               # localStorage read/write helpers
```

---

## Add Expense Page

**Fields:**
- Date (defaults to today in `yyyy-MM-dd`)
- Name (text)
- Amount (number)
- Tags (multi-chip input; default chip `general` pre-added; user can type to add more)

**Behaviour:**
- On submit → item appended to sync queue instantly → form resets (date stays as today, tags reset to `[general]`)
- Submission is non-blocking; user can add another expense immediately

**Pending Queue (below form):**
- Shows all items in the queue with `status: pending | syncing | failed`
- `syncing` → spinning icon
- `failed` → red "↺ Retry" button; tapping resets status to `pending`
- `success` → item silently removed from the list
- Queue is hidden when empty

---

## Sync Queue (SyncQueueContext)

**Shape of each item:**
```js
{
  localId: string,      // Date.now() + random suffix
  date: string,
  name: string,
  amount: number,
  tags: string[],
  status: 'pending' | 'syncing' | 'failed'
}
```

**Persistence:** Full queue array written to `localStorage` on every state change. Loaded on app init.

**Sync loop:**
- `useEffect` watches the queue
- Picks up all `pending` items, marks them `syncing`, fires parallel `api.add()` calls
- Success → remove from queue
- Failure → mark `failed`
- If no script URL is configured, items stay `pending` indefinitely (no error thrown)

---

## View Expenses Page

**Header (gradient card):**
- FY selector dropdown (populated from `list_sheets` API call; falls back to client-derived current + 3 prior FYs if call fails)
- Year total for selected FY

**Filter chips (horizontal scroll row):**
- Months in the selected FY up to current month (e.g. Apr 2026, Mar 2026 … Apr 2025), current month selected by default
- Unique tags for the selected FY (from `list_tags` API call; hidden if call fails)
- Single-select only (one active chip at a time across both month and tag chips)

**Expense list:**
- Filtered total + refresh button at top of list
- Rows: name, date + tag (coloured), amount
- Sorted newest first (handled by API)
- Empty state: "No expenses for this period"

**Data fetching:**
- On mount: `list_sheets` → `list_tags` for current FY → `list` for current month
- On FY change: `list_tags` for new FY + `list` for most recent month of that FY (current month if it's the current FY; March if it's a past FY)
- On chip tap: `list` with updated filter
- On refresh: repeat last `list` call

---

## Settings Page

**Fields:**
- Apps Script URL (text input, full URL)
- Save button

**Behaviour:**
- URL saved to `localStorage` under key `scriptUrl`
- Warning banner shown if no URL is configured
- Saving a valid URL triggers a retry of all `failed` queue items

---

## Apps Script Changes (`api.gs`)

Two new actions added to `doPost`:

### `list_sheets`
Returns all sheet names matching `FY \d{4}-\d{2}`, sorted newest first.
```js
// response
{ sheets: ['FY 2025-26', 'FY 2024-25', 'FY 2023-24'] }
```

### `list_tags`
Scans the given FY sheet, returns all unique non-empty tag values sorted alphabetically.
```js
// request
{ action: 'list_tags', fyName: 'FY 2025-26' }
// response
{ tags: ['food', 'fuel', 'general', 'medical'] }
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| No script URL set | Queue items stay `pending`; Settings shows warning banner |
| API call fails (add) | Item marked `failed`; Retry button shown |
| `list_sheets` fails | FY selector shows client-derived years (current + 3 prior) |
| `list_tags` fails | Tag chips hidden for that FY |
| `list` fails | Error message inline; Retry / refresh button available |
| Empty result | "No expenses for this period" empty state |

---

## GitHub Pages Deployment

- Vite `base` config set to `/khatabook/` (repo name)
- React Router uses `BrowserRouter` with `basename="/khatabook/"`
- `404.html` redirect trick to handle direct URL navigation
- Deploy via `gh-pages` npm script: `npm run deploy`

---

## PWA

- `vite-plugin-pwa` generates service worker + manifest
- App name: "Khatabook"
- Theme color: `#6366f1`
- Icons: generated from a single source SVG
- Offline behaviour: app shell cached; API calls fail gracefully when offline (items stay `pending`)
