import { useEffect, useState } from 'react'
import { listExpenses } from '../lib/api'
import { getCachedTags } from '../lib/metadataCache'
import { currentFYName, fyMonthChips, getTagsCache } from '../lib/storage'
import BottomNav from '../components/BottomNav'
import FYSelector from '../components/FYSelector'
import FilterChips from '../components/FilterChips'
import ExpenseList from '../components/ExpenseList'

export default function ViewExpenses() {
  const [fy, setFY] = useState(currentFYName)
  const [yearTotal, setYearTotal] = useState(0)
  const [tagChips, setTagChips] = useState(() => {
    const cached = getTagsCache(currentFYName())
    return cached ? cached.map(t => ({ label: t, value: t, filter: 'tag' })) : []
  })
  const [activeChip, setActiveChip] = useState(() => fyMonthChips(currentFYName())[0] ?? null)
  const [expenses, setExpenses] = useState([])
  const [filteredTotal, setFilteredTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const monthChips = fyMonthChips(fy)
  const allChips = [...monthChips, ...tagChips]

  // On FY change: fetch expenses + tags in parallel.
  // getCachedTags resolves instantly from localStorage when warm (primed on app launch),
  // so tag chips appear before the expense list finishes loading.
  useEffect(() => {
    const ac = new AbortController()
    async function load() {
      const chip = fyMonthChips(fy)[0]
      if (!chip) return
      setLoading(true)
      setError(null)
      try {
        const [data, freshTags] = await Promise.all([
          listExpenses({ filter: chip.filter, value: chip.value, fyName: fy }),
          getCachedTags(fy),
        ])
        if (ac.signal.aborted) return
        setTagChips(freshTags.map(t => ({ label: t, value: t, filter: 'tag' })))
        setExpenses(data.expenses)
        setFilteredTotal(data.filteredTotal)
        setYearTotal(data.yearTotal)
      } catch (e) {
        if (!ac.signal.aborted) setError(e.message)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => ac.abort()
  }, [fy])

  function handleFYChange(newFY) {
    setFY(newFY)
    setActiveChip(fyMonthChips(newFY)[0] ?? null)
    const cached = getTagsCache(newFY)
    setTagChips(cached ? cached.map(t => ({ label: t, value: t, filter: 'tag' })) : [])
  }

  async function handleChipSelect(chip) {
    setActiveChip(chip)
    setLoading(true)
    setError(null)
    try {
      const data = await listExpenses({ filter: chip.filter, value: chip.value, fyName: fy })
      setExpenses(data.expenses)
      setFilteredTotal(data.filteredTotal)
      setYearTotal(data.yearTotal)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    if (!activeChip) return
    await handleChipSelect(activeChip)
  }

  return (
    <div className="flex h-screen flex-col bg-white pb-16 overflow-hidden">
      {/* Header */}
      <div className="gradient-brand px-4 pb-5 pt-10">
        <div className="mb-3 flex items-center gap-1.5">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-4 w-4 rounded-sm" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200">
            Financial Year
          </p>
        </div>
        <div className="flex items-center justify-between">
          <FYSelector value={fy} onChange={handleFYChange} />
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

      {/* Filtered total + refresh — fixed */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Filtered Total
          </p>
          {loading && expenses.length === 0 ? (
            <div className="mt-1 h-7 w-20 animate-pulse rounded bg-gray-100" />
          ) : (
            <p className="text-xl font-bold text-gray-800">
              ₹{Number(filteredTotal || 0).toLocaleString('en-IN')}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="gradient-brand rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {loading ? '⟳' : '⟳ Refresh'}
        </button>
      </div>

      {/* Scrollable expense list */}
      <div className="flex-1 overflow-y-auto">
        <ExpenseList
          expenses={expenses}
          loading={loading}
          error={error}
        />
      </div>

      <BottomNav />
    </div>
  )
}
