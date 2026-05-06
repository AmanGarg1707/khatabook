import { useSyncQueue } from '../context/SyncQueueContext'

export default function PendingQueue() {
  const { queue, retry } = useSyncQueue()
  if (queue.length === 0) return null

  return (
    <div className="mx-4 mb-4 flex h-full flex-col rounded-xl border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        Pending Sync
      </p>
      <ul className="flex-1 space-y-2 overflow-y-auto">
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
