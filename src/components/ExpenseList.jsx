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

export default function ExpenseList({ expenses, loading, error }) {
  const groups = groupByDate(expenses)

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
                  <li key={expense.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{expense.name}</p>
                      <p className="text-[11px] text-gray-400">
                        <span className="text-purple-500">{expense.tags.join(', ')}</span>
                      </p>
                    </div>
                    <p className="font-semibold text-indigo-500">
                      ₹{Number(expense.amount).toLocaleString('en-IN')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))
      }
    </div>
  )
}
