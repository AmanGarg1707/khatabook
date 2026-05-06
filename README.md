# Khatabook

A personal expense tracker PWA backed by Google Sheets. Built with React + Vite, hosted on GitHub Pages, and powered by a Google Apps Script web API — no server required.

## Features

- **Add Expense** — default landing page; log date, name, amount, and custom tags (multi-tag input, `general` by default)
- **Async sync queue** — submissions fire in the background; a pending list shows sync status below the form with one-tap retry on failure
- **View Expenses** — filter by financial year, month, or tag using chip selectors; live filtered total with manual refresh
- **Financial year sheets** — each FY (`FY 2024-25`, etc.) lives in its own Google Sheet tab; the app auto-detects available years and tags from the sheet
- **Settings** — configure the Google Apps Script URL from within the app (gear icon, top-right)
- **PWA** — installable on Android/iOS; works offline for form entry, syncs when connectivity returns
- **Daily email report** — optional Apps Script trigger sends yesterday's expenses + month-to-date total each morning

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Tailwind CSS 4 |
| Build | Vite 8, vite-plugin-pwa |
| Hosting | GitHub Pages (`gh-pages`) |
| Backend | Google Apps Script (deployed as a web app) |
| Storage | Google Sheets (one sheet per financial year) |

## Project Structure

```
khatabook/
├── src/
│   ├── pages/
│   │   ├── AddExpense.jsx     # Default route — expense form + pending queue
│   │   ├── ViewExpenses.jsx   # List view with FY/month/tag filters
│   │   └── Settings.jsx       # Script URL configuration
│   ├── components/
│   │   ├── BottomNav.jsx      # Navigation bar
│   │   ├── ExpenseList.jsx    # Rendered expense rows
│   │   ├── FilterChips.jsx    # FY / month / tag chip selectors
│   │   ├── FYSelector.jsx     # Financial year dropdown
│   │   └── PendingQueue.jsx   # In-flight / failed sync items
│   ├── context/
│   │   └── SyncQueueContext.jsx  # Async queue state + retry logic
│   └── lib/
│       ├── api.js             # fetch wrapper for the Apps Script API
│       ├── metadataCache.js   # 24 h TTL cache for sheets + tags lists
│       └── storage.js         # localStorage helpers (script URL, FY name)
├── scripts/
│   ├── api.gs                 # Apps Script: add / edit / delete / list expenses
│   └── report.gs              # Apps Script: daily email summary trigger
└── public/                    # Icons and PWA assets
```

## Setup

### 1. Google Sheets + Apps Script

1. Create a Google Sheet (it can be empty).
2. Open **Extensions → Apps Script** and paste the contents of `scripts/api.gs`.
3. Optionally paste `scripts/report.gs` in the same project for daily email reports (edit `REPORT_EMAILS` first, then run `setupDailyTrigger` once to register the 8 AM trigger).
4. Click **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone** (the URL is your secret — keep it private)
5. Copy the deployment URL.

### 2. Configure the App

Open the app, tap the gear icon (top-right on any page), and paste the Apps Script deployment URL. It is stored in `localStorage` on the device.

### 3. Run Locally

```bash
npm install
npm run dev
```

### 4. Deploy to GitHub Pages

```bash
npm run deploy
```

This runs `vite build` then publishes `dist/` to the `gh-pages` branch. The app will be live at `https://<your-username>.github.io/khatabook/`.

## Apps Script API

All requests are `POST` with a JSON body to the web app URL.

| `action` | Required fields | Description |
|---|---|---|
| `add` | `date`, `name`, `amount`, `tags[]` | Append a new expense row |
| `edit` | `id`, `date`, `name`, `amount`, `tags[]` | Update an existing row by ID |
| `delete` | `id` | Delete a row by ID |
| `list` | `filter` (`month`/`tag`/`year`), `value`, `fyName` | Return filtered expenses + totals |
| `list_sheets` | — | Return all FY sheet names |
| `list_tags` | `fyName` | Return unique tags for a sheet |

Responses are JSON. Errors include an `error` field.

## License

MIT
