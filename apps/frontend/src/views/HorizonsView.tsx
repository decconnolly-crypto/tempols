import { useState } from 'react'
import type { Horizon, Milestone } from '../types'

interface HorizonsViewProps {
  horizons: Horizon[]
  onOpenCreate: () => void
  onOpenAIPlanner: () => void
  onOpenMilestoneCreate?: (horizon: Horizon) => void
  onToggleMilestone?: (milestoneId: string) => void
  onMilestoneClick?: (milestone: Milestone) => void
}

export function HorizonsView({
  horizons,
  onOpenCreate,
  onOpenAIPlanner,
  onOpenMilestoneCreate,
  onToggleMilestone,
  onMilestoneClick,
}: HorizonsViewProps) {
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false)

  const activeHorizons = horizons.filter((h) => h.status === 'ACTIVE' && h.progress < 100)
  const completedHorizons = horizons.filter(
    (h) => h.status === 'COMPLETED' || h.progress === 100
  )

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8 gap-2">
        <h2 className="text-[2.2rem] font-medium text-black tracking-tight">Horizons</h2>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenAIPlanner}
            className="bg-white text-black text-xs font-medium px-4 py-2.5 rounded-full shadow-sm border border-black/5 hover:bg-black hover:text-white transition-colors"
          >
            ✨ Plan with AI
          </button>
          <button
            onClick={onOpenCreate}
            className="bg-black text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-md"
          >
            + New
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {activeHorizons.length === 0 ? (
          <div className="bg-white/50 border border-dashed border-black/10 rounded-[2rem] p-8 text-center text-xs font-medium text-black/50">
            No active horizons. Tap + to start a new project!
          </div>
        ) : (
          activeHorizons.map((h) => (
            <HorizonCard
              key={h.id}
              horizon={h}
              onOpenMilestoneCreate={onOpenMilestoneCreate}
              onToggleMilestone={onToggleMilestone}
              onMilestoneClick={onMilestoneClick}
            />
          ))
        )}
      </div>

      {completedHorizons.length > 0 && (
        <div className="mt-10 pt-6 border-t border-black/10">
          <button
            onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
            className="flex items-center justify-between w-full px-2 py-2 text-xs font-medium text-black/60 hover:text-black transition-colors"
          >
            <span className="uppercase tracking-wider">
              Completed Horizons ({completedHorizons.length})
            </span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                isCompletedExpanded ? 'rotate-180' : ''
              }`}
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
                    <h3 className="text-lg font-medium text-black/70 line-through">
                      {h.title}
                    </h3>
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

function HorizonCard({
  horizon,
  onOpenMilestoneCreate,
  onToggleMilestone,
  onMilestoneClick,
}: {
  horizon: Horizon
  onOpenMilestoneCreate?: (horizon: Horizon) => void
  onToggleMilestone?: (milestoneId: string) => void
  onMilestoneClick?: (milestone: Milestone) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const isQuarterly = horizon.horizonType === 'QUARTERLY'
  const hasMilestones = horizon.milestones.length > 0

  return (
    <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full text-left p-7"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isQuarterly && horizon.quarter && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-black bg-black/10 px-2 py-0.5 rounded-full">
                  {horizon.quarter}
                </span>
              )}
              {horizon.targetDate && (
                <span className="text-[10px] font-medium text-black/40">
                  {new Date(horizon.targetDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}
            </div>
            <h3 className="text-lg font-medium text-black leading-tight">{horizon.title}</h3>
            {horizon.description && (
              <p className="text-[12px] font-medium text-black/50 mt-1 line-clamp-2">
                {horizon.description}
              </p>
            )}
          </div>
          <span className="text-xs font-medium text-black/50 bg-gray-100 px-3 py-1 rounded-full shrink-0">
            #{horizon.targetTag}
          </span>
        </div>

        <div className="w-full h-2.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-black rounded-full transition-all duration-500"
            style={{ width: `${horizon.progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-gray-500">
            {horizon.progress}% · {horizon.completedTasks}/{horizon.totalTasks} tasks
            {hasMilestones && (
              <>
                {' '}
                · {horizon.completedMilestones}/{horizon.totalMilestones} milestones
              </>
            )}
          </p>
          <svg
            className={`w-4 h-4 text-black/30 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-7 pb-7 pt-0 border-t border-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
          {horizon.keyResults.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-semibold text-black/40 uppercase tracking-wider mb-2">
                Key Results
              </p>
              <ul className="space-y-1.5">
                {horizon.keyResults.map((kr, i) => (
                  <li key={i} className="text-[13px] font-medium text-black flex items-start gap-2">
                    <span className="text-black/30 mt-0.5">•</span>
                    <span>{kr}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-black/40 uppercase tracking-wider">
                Milestones {hasMilestones && `(${horizon.milestones.length})`}
              </p>
              {onOpenMilestoneCreate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenMilestoneCreate(horizon)
                  }}
                  className="text-[11px] font-semibold text-black bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-full transition-colors"
                >
                  + Add
                </button>
              )}
            </div>

            {!hasMilestones ? (
              <p className="text-[12px] font-medium text-black/40 italic">
                No milestones yet. Break this horizon into weekly anchors.
              </p>
            ) : (
              <div className="space-y-2">
                {horizon.milestones.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onMilestoneClick?.(m)}
                    className={`rounded-2xl p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      m.isCompleted ? 'bg-black/5' : 'bg-[#F4F3F0] active:bg-[#e8e5e0]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleMilestone?.(m.id)
                      }}
                      className={`mt-0.5 min-w-[20px] h-5 w-5 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                        m.isCompleted ? 'bg-black' : 'border-2 border-black/40'
                      }`}
                    >
                      {m.isCompleted && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
                          Week {m.weekNumber}
                        </span>
                        <span className="text-[10px] font-medium text-black/30">
                          {new Date(m.targetDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <p
                        className={`text-[13px] font-medium ${
                          m.isCompleted ? 'text-black/50 line-through' : 'text-black'
                        }`}
                      >
                        {m.title}
                      </p>
                      {m.description && (
                        <p className="text-[11px] font-medium text-black/40 mt-0.5">
                          {m.description}
                        </p>
                      )}
                      {m.taskCount > 0 && (
                        <p className="text-[10px] font-medium text-black/30 mt-1">
                          {m.completedTaskCount}/{m.taskCount} tasks
                        </p>
                      )}
                    </div>
                    <svg
                      className="w-4 h-4 text-black/20 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}