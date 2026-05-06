import { useEffect, useState } from 'react'
import { deleteExpense, editExpense, listExpenses } from '../lib/api'
import { getCachedTags, refreshTagsForFY } from '../lib/metadataCache'
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
  const [busyExpenseId, setBusyExpenseId] = useState(null)
  const [deleteCandidateId, setDeleteCandidateId] = useState(null)
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

  async function reloadAfterMutation(nextActiveChip = activeChip) {
    const tags = await refreshTagsForFY(fy)
    setTagChips(tags.map(t => ({ label: t, value: t, filter: 'tag' })))

    let chipToLoad = nextActiveChip
    if (nextActiveChip?.filter === 'tag') {
      const exists = tags.some(tag => tag.toLowerCase() === nextActiveChip.value.toLowerCase())
      if (!exists) {
        chipToLoad = fyMonthChips(fy)[0] ?? null
        setActiveChip(chipToLoad)
      }
    }

    if (!chipToLoad) return
    const data = await listExpenses({ filter: chipToLoad.filter, value: chipToLoad.value, fyName: fy })
    setExpenses(data.expenses)
    setFilteredTotal(data.filteredTotal)
    setYearTotal(data.yearTotal)
  }

  async function handleEditExpense(updatedExpense) {
    setError(null)
    setBusyExpenseId(updatedExpense.id)
    try {
      await editExpense(updatedExpense)
      await reloadAfterMutation()
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setBusyExpenseId(null)
    }
  }

  function handleDeleteExpense(expenseId) {
    setDeleteCandidateId(expenseId)
  }

  async function confirmDeleteExpense() {
    if (!deleteCandidateId) return
    setError(null)
    setBusyExpenseId(deleteCandidateId)
    try {
      await deleteExpense(deleteCandidateId)
      await reloadAfterMutation()
      setDeleteCandidateId(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyExpenseId(null)
    }
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
          onEdit={handleEditExpense}
          onDelete={handleDeleteExpense}
          busyExpenseId={busyExpenseId}
        />
      </div>

      {deleteCandidateId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-20 sm:items-center sm:pb-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-4 shadow-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400">
              Confirm Delete
            </p>
            <h3 className="mt-1 text-base font-bold text-gray-800">Delete this expense?</h3>
            <p className="mt-1 text-sm text-gray-500">
              This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteCandidateId(null)}
                disabled={busyExpenseId === deleteCandidateId}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteExpense}
                disabled={busyExpenseId === deleteCandidateId}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {busyExpenseId === deleteCandidateId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
