import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Add', icon: '➕' },
  { to: '/view', label: 'View', icon: '📋' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-gray-100 bg-white">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-indigo-500' : 'text-gray-400'
            }`
          }
        >
          <span className="mb-0.5 text-lg">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
