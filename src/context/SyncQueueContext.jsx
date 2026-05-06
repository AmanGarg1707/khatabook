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
