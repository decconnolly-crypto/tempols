import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Focus' },
  { to: '/today', label: 'Today' },
  { to: '/horizons', label: 'Horizons' },
  { to: '/habits', label: 'Habits' },
]

export function Layout() {
  return (
    <div className="min-h-svh bg-white text-stone-900">
      <header className="border-b border-stone-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <p className="text-lg font-medium tracking-tight">TempoLS</p>
          <nav className="flex gap-4 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive ? 'text-stone-900' : 'text-stone-500'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
