import { useEffect, useState } from 'react'
import { getCachedSheets } from '../lib/metadataCache'

function clientFallbackFYs() {
  const now = new Date()
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return [`FY ${fyStart}-${String(fyStart + 1).slice(-2)}`]
}

export default function FYSelector({ value, onChange }) {
  const [options, setOptions] = useState([])

  useEffect(() => {
    getCachedSheets(clientFallbackFYs).then(setOptions)
  }, [])

  if (options.length === 0) return null

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold text-white focus:outline-none"
    >
      {options.map(fy => (
        <option key={fy} value={fy} className="text-gray-800">
          {fy}
        </option>
      ))}
    </select>
  )
}
