import type { AppTask } from '../types'

interface DaySummaryCardProps {
  tasks: AppTask[]
  onOpenTask?: (task: AppTask) => void
  onOpenPlanner?: () => void
}

export function DaySummaryCard({ tasks, onOpenTask, onOpenPlanner }: DaySummaryCardProps) {
  const total = tasks.length
  const completed = tasks.filter((t) => t.isCompleted).length
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)
  const allDone = total > 0 && completed === total

  // First uncompleted task, in the natural phase order
  const phaseOrder = { MORNING: 0, AFTERNOON: 1, EVENING: 2 } as const
  const nextTask = tasks
    .filter((t) => !t.isCompleted)
    .sort((a, b) => phaseOrder[a.phase] - phaseOrder[b.phase])[0]

  // ─── Empty state ───────────────────────────────────
  if (total === 0) {
    return (
      <div className="bg-white rounded-[1.75rem] px-5 py-4 mb-5 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-[13px] font-medium text-black">Nothing planned today.</p>
          <p className="text-[11px] font-medium text-black/40 mt-0.5">
            Let the coach build your day.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPlanner}
          className="text-[11px] font-semibold bg-black text-white px-3.5 py-2 rounded-full active:scale-95 transition-transform shrink-0 ml-3"
        >
          Plan my day
        </button>
      </div>
    )
  }

  // ─── All done state ────────────────────────────────
  if (allDone) {
    return (
      <div className="bg-white rounded-[1.75rem] px-5 py-4 mb-5 shadow-sm animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            {tasks.map((t) => (
              <span
                key={t.id}
                className="w-2 h-2 rounded-full bg-black transition-all duration-300 ease-out scale-110"
              />
            ))}
          </div>
        </div>
        <p className="text-[13px] font-medium text-black">That&apos;s the day. 🎉</p>
      </div>
    )
  }

  // ─── Normal state ──────────────────────────────────
  return (
    <button
      type="button"
      onClick={() => nextTask && onOpenTask?.(nextTask)}
      className="bg-white rounded-[1.75rem] px-5 py-4 mb-5 w-full text-left shadow-sm active:scale-[0.99] transition-transform"
    >
      {/* Top row: dots + count + Next cue */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          {tasks.map((t) => (
            <span
              key={t.id}
              className={`w-2 h-2 rounded-full transition-all duration-300 ease-out ${
                t.isCompleted ? 'bg-black scale-110' : 'bg-black/15 scale-100'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-black">
            {completed} of {total}
          </span>
          <span className="text-[10px] font-bold text-black/30">{percentage}%</span>
        </div>
      </div>

      {/* Bottom row: next task */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-black/40 uppercase tracking-wider mb-0.5">
            Next up
          </p>
          <p className="text-[14px] font-medium text-black truncate">
            {nextTask?.title || 'All clear'}
          </p>
        </div>
        {nextTask && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-medium text-black/60">
              {nextTask.durationMinutes}m
            </span>
            <svg
              className="w-3.5 h-3.5 text-black/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  )
}