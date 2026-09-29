import { useState } from 'react'
import type { Horizon } from '../types'

export function HorizonsView({ horizons, onOpenCreate }: { horizons: Horizon[]; onOpenCreate: () => void }) {
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false)

  const activeHorizons = horizons.filter((h) => h.progress < 100)
  const completedHorizons = horizons.filter((h) => h.progress === 100)

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[2.2rem] font-medium text-black tracking-tight">Horizons</h2>
        <button
          onClick={onOpenCreate}
          className="bg-black text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-md"
        >
          + New Horizon
        </button>
      </div>

      <div className="space-y-4">
        {activeHorizons.length === 0 ? (
          <div className="bg-white/50 border border-dashed border-black/10 rounded-[2rem] p-8 text-center text-xs font-medium text-black/50">
            No active horizons. Tap + to start a new project!
          </div>
        ) : (
          activeHorizons.map((h) => (
            <div key={h.id} className="bg-white rounded-[2rem] p-7 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-black">{h.title}</h3>
                <span className="text-xs font-medium text-black/50 bg-gray-100 px-3 py-1 rounded-full">
                  #{h.targetTag}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all duration-500"
                  style={{ width: `${h.progress}%` }}
                />
              </div>
              <p className="text-[13px] font-medium text-gray-500">
                {h.progress}% completed · {h.completedTasks}/{h.totalTasks} tasks done
              </p>
            </div>
          ))
        )}
      </div>

      {completedHorizons.length > 0 && (
        <div className="mt-10 pt-6 border-t border-black/10">
          <button
            onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
            className="flex items-center justify-between w-full px-2 py-2 text-xs font-medium text-black/60 hover:text-black transition-colors"
          >
            <span className="uppercase tracking-wider">Completed Horizons ({completedHorizons.length})</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isCompletedExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isCompletedExpanded && (
            <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {completedHorizons.map((h) => (
                <div key={h.id} className="bg-black/5 rounded-[2rem] p-7 opacity-75">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-medium text-black/70 line-through">{h.title}</h3>
                    <span className="text-xs font-medium text-black/40 bg-black/5 px-3 py-1 rounded-full">
                      #{h.targetTag}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-black/10 rounded-full mb-4 overflow-hidden">
                    <div className="h-full bg-black rounded-full w-full" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-500">
                    100% completed · {h.completedTasks}/{h.totalTasks} tasks done 🎉
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}