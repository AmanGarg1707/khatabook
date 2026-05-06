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
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return [`FY ${fyStart}-${String(fyStart + 1).slice(-2)}`]
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
