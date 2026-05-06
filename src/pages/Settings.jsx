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
        <div className="flex items-center gap-1.5">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-4 w-4 rounded-sm" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200">
            Khatabook
          </p>
        </div>
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
          disabled={saved}
          className="gradient-brand w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 active:opacity-90 disabled:opacity-60"
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
