import type { Milestone } from '../types'

interface MilestoneDetailSheetProps {
  milestone: Milestone | null
  onClose: () => void
  onToggleTask: (taskId: string) => void
  onToggleMilestone: (milestoneId: string) => void
  onDelete?: (milestoneId: string) => void
}

export function MilestoneDetailSheet({
  milestone,
  onClose,
  onToggleTask,
  onToggleMilestone,
  onDelete,
}: MilestoneDetailSheetProps) {
  if (!milestone) return null

  const incompleteTasks = milestone.tasks.filter((t) => !t.isCompleted)
  const completedTasks = milestone.tasks.filter((t) => t.isCompleted)
  const progress =
    milestone.taskCount === 0
      ? 0
      : Math.round((milestone.completedTaskCount / milestone.taskCount) * 100)

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-md rounded-t-[2rem] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 bg-black/15 rounded-full" />
        </div>

        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
                Week {milestone.weekNumber}
              </span>
              <span className="text-[10px] font-medium text-black/30">
                {new Date(milestone.targetDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
            <h2 className="text-lg font-medium text-black leading-tight">
              {milestone.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center text-black/50 hover:text-black shrink-0"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {milestone.description && (
          <p className="text-[12px] font-medium text-black/50 mb-5">
            {milestone.description}
          </p>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
              Progress
            </span>
            <span className="text-[11px] font-semibold text-black">
              {milestone.completedTaskCount} of {milestone.taskCount}
            </span>
          </div>
          <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {incompleteTasks.length > 0 ? (
          <div className="space-y-2 mb-4">
            {incompleteTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onToggleTask(task.id)}
                className="w-full bg-[#F4F3F0] rounded-2xl p-4 flex items-start gap-3 text-left active:scale-[0.99] transition-transform"
              >
                <div className="mt-0.5 min-w-[22px] h-[22px] rounded-full border-2 border-black flex items-center justify-center shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-black leading-snug">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-[11px] font-medium text-black/50 mt-0.5">
                      {task.description}
                    </p>
                  )}
                  <p className="text-[10px] font-medium text-black/40 mt-1.5">
                    {new Date(task.scheduledDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {' · '}
                    {task.durationMinutes}m
                    {' · '}
                    {task.phase}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-black/10 rounded-2xl py-6 px-5 text-center mb-4">
            <p className="text-[12px] font-medium text-black/50">
              {milestone.taskCount === 0
                ? 'No tasks linked to this milestone yet.'
                : 'All tasks done. Nice.'}
            </p>
          </div>
        )}

        {completedTasks.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-2">
              Completed ({completedTasks.length})
            </p>
            <div className="space-y-1.5">
              {completedTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  className="w-full bg-black/5 rounded-2xl p-3 flex items-center gap-3 text-left"
                >
                  <div className="min-w-[20px] h-5 w-5 rounded-full bg-black flex items-center justify-center shrink-0">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[12px] font-medium text-black/50 line-through truncate">
                    {task.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onToggleMilestone(milestone.id)
          }}
          className={`w-full text-[13px] font-semibold py-3.5 rounded-full transition-colors ${
            milestone.isCompleted
              ? 'bg-gray-100 text-black hover:bg-gray-200'
              : 'bg-black text-white hover:bg-black/80'
          }`}
        >
          {milestone.isCompleted ? 'Mark incomplete' : 'Mark milestone complete'}
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(
                'Delete this milestone? Its tasks will stay in your schedule.'
              )
              if (confirmed) {
                onDelete(milestone.id)
                onClose()
              }
            }}
            className="w-full mt-2 text-rose-500 text-[12px] font-medium py-2 hover:text-rose-600 transition-colors"
          >
            Delete milestone
          </button>
        )}
      </div>
    </div>
  )
}