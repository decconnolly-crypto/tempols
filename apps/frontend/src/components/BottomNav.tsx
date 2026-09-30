import { useLocation } from 'wouter'

export function BottomNav({ onOpenCapture }: { onOpenCapture: () => void }) {
  const [location, setLocation] = useLocation()

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="relative bg-black/75 backdrop-blur-2xl rounded-full px-4 py-4 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-white/10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

        <button
          onClick={() => setLocation('/')}
          aria-label="Home"
          className={`relative transition-all p-1 ${
            location === '/' ? 'text-white scale-110' : 'text-white/40 hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        <button
          onClick={() => setLocation('/horizons')}
          aria-label="Horizons"
          className={`relative transition-all p-1 ${
            location === '/horizons' ? 'text-white scale-110' : 'text-white/40 hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>

        <button
          onClick={onOpenCapture}
          aria-label="Quick capture"
          className="relative text-white hover:scale-110 transition-transform p-1"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button
          onClick={() => setLocation('/meals')}
          aria-label="Meals"
          className={`relative transition-all p-1 ${
            location === '/meals' ? 'text-white scale-110' : 'text-white/40 hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>

        <button
          onClick={() => setLocation('/habits')}
          aria-label="Habits"
          className={`relative transition-all p-1 ${
            location === '/habits' ? 'text-white scale-110' : 'text-white/40 hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    </div>
  )
}