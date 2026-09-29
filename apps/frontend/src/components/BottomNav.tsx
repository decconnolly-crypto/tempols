import { useLocation } from 'wouter'

export function BottomNav({ onOpenCapture }: { onOpenCapture: () => void }) {
  const [location, setLocation] = useLocation()

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-black rounded-full px-8 py-4 flex items-center justify-between shadow-2xl">
        <button
          onClick={() => setLocation('/')}
          className={`transition-all ${location === '/' ? 'text-white scale-110' : 'text-white/40 hover:text-white'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
        <button
          onClick={() => setLocation('/horizons')}
          className={`transition-all ${location === '/horizons' ? 'text-white scale-110' : 'text-white/40 hover:text-white'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
        <button onClick={onOpenCapture} className="text-white hover:scale-110 transition-transform">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={() => setLocation('/habits')}
          className={`transition-all ${location === '/habits' ? 'text-white scale-110' : 'text-white/40 hover:text-white'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    </div>
  )
}