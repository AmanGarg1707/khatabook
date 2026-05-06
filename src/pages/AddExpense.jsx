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
    <div className="flex h-screen flex-col bg-white pb-16 overflow-hidden">
      {/* Header */}
      <div className="gradient-brand px-4 pb-5 pt-10">
        <div className="flex items-center gap-1.5">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-4 w-4 rounded-sm" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200">
            Khatabook
          </p>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-white">Add Expense</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div>
          <label htmlFor="date" className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            autoComplete="off"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label htmlFor="name" className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="off"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Groceries"
            required
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label htmlFor="amount" className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Amount (₹)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            autoComplete="off"
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
          <label htmlFor="tag-input" className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
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
              id="tag-input"
              name="tag-input"
              type="text"
              autoComplete="off"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder="+ tag"
              className="min-w-15 flex-1 bg-transparent text-[11px] text-gray-600 placeholder-gray-300 focus:outline-none"
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

      <div className="flex-1 overflow-hidden">
        <PendingQueue />
      </div>
      <BottomNav />
    </div>
  )
}
