import { useState } from 'react'

function formatDateHeader(dateStr) {
  const d = new Date(dateStr + 'T00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (dateStr === today.toLocaleDateString('en-CA')) return 'Today'
  if (dateStr === yesterday.toLocaleDateString('en-CA')) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function groupByDate(expenses) {
  const groups = []
  let current = null
  for (const e of expenses) {
    if (!current || current.date !== e.date) {
      current = { date: e.date, items: [] }
      groups.push(current)
    }
    current.items.push(e)
  }
  return groups
}

function SkeletonRow() {
  return (
    <li className="flex items-center justify-between py-3">
      <div className="space-y-1.5">
        <div className="h-3.5 w-32 animate-pulse rounded bg-gray-100" />
        <div className="h-2.5 w-24 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="h-3.5 w-14 animate-pulse rounded bg-gray-100" />
    </li>
  )
}

export default function ExpenseList({ expenses, loading, error, onEdit, onDelete, busyExpenseId }) {
  const groups = groupByDate(expenses)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({ date: '', name: '', amount: '', tags: '' })

  function startEdit(expense) {
    setEditingId(expense.id)
    setDraft({
      date: expense.date,
      name: expense.name,
      amount: String(expense.amount),
      tags: expense.tags.join(', '),
    })
  }

  async function handleSaveEdit(id) {
    const name = draft.name.trim()
    const amount = Number(draft.amount)
    const tags = draft.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    if (!name || !draft.date || !Number.isFinite(amount) || amount < 0) return
    await onEdit({ id, date: draft.date, name, amount, tags })
    setEditingId(null)
  }

  return (
    <div className="px-4">
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-500">{error}</p>
      )}

      {!loading && expenses.length === 0 && !error && (
        <p className="py-8 text-center text-sm text-gray-400">No expenses for this period</p>
      )}

      {loading && expenses.length === 0
        ? <ul className="divide-y divide-gray-50">
            {Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)}
          </ul>
        : groups.map(group => (
            <div key={group.date}>
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-white py-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="rounded-full bg-gray-100 px-3 py-0.5 text-[10px] font-medium text-gray-400">
                  {formatDateHeader(group.date)}
                </span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <ul className="divide-y divide-gray-50">
                {group.items.map(expense => (
                  <li key={expense.id} className="py-3">
                    {editingId === expense.id ? (
                      <div className="rounded-xl border border-indigo-100 bg-linear-to-b from-indigo-50/70 to-white p-3 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">
                            Edit Expense
                          </p>
                          <p className="text-[11px] font-semibold text-indigo-500">
                            ID {expense.id}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              Date
                            </label>
                            <input
                              type="date"
                              value={draft.date}
                              onChange={e => setDraft(prev => ({ ...prev, date: e.target.value }))}
                              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              Amount
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={draft.amount}
                              onChange={e => setDraft(prev => ({ ...prev, amount: e.target.value }))}
                              placeholder="0.00"
                              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          </div>
                        </div>

                        <div className="mt-2">
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Name
                          </label>
                          <input
                            type="text"
                            value={draft.name}
                            onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Expense name"
                            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>

                        <div className="mt-2">
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Tags
                          </label>
                          <input
                            type="text"
                            value={draft.tags}
                            onChange={e => setDraft(prev => ({ ...prev, tags: e.target.value }))}
                            placeholder="milk, grocery"
                            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>

                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={busyExpenseId === expense.id}
                            onClick={() => handleSaveEdit(expense.id)}
                            className="gradient-brand rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{expense.name}</p>
                          <p className="text-[11px] text-gray-400">
                            <span className="text-purple-500">{expense.tags.join(', ')}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-indigo-500">
                            ₹{Number(expense.amount).toLocaleString('en-IN')}
                          </p>
                          <div className="mt-1 flex justify-end gap-3">
                            <button
                              type="button"
                              disabled={busyExpenseId === expense.id}
                              onClick={() => startEdit(expense)}
                              className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-500 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busyExpenseId === expense.id}
                              onClick={() => onDelete(expense.id)}
                              className="rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-500 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
      }
    </div>
  )
}
