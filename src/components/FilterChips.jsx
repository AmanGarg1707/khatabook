export default function FilterChips({ chips, active, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
      {chips.map(chip => (
        <button
          key={chip.value}
          onClick={() => onSelect(chip)}
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
            active === chip.value
              ? 'gradient-brand text-white'
              : 'border border-gray-200 bg-gray-50 text-gray-500'
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
