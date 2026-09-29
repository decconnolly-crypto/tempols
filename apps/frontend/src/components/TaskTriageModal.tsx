import type { AppTask } from '../types'

interface TaskTriageModalProps {
  isOpen: boolean
  overdueTasks: AppTask[]
  onKeepForToday: (taskId: string) => void
  onMoveToBacklog: (taskId: string) => void
  onDropTask: (taskId: string) => void
  onClose: () => void
}

export function TaskTriageModal({
  isOpen,
  overdueTasks,
  onKeepForToday,
  onMoveToBacklog,
  onDropTask,
  onClose,
}: TaskTriageModalProps) {
  if (!isOpen || overdueTasks.length === 0) return null

  const currentTask = overdueTasks[0]

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white rounded-[2.5rem] p-7 w-full max-w-md shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200 text-center">
        <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-100 text-amber-900 px-3 py-1 rounded-full inline-block mb-3">
          Task Debt Triage ({overdueTasks.length} remaining)
        </span>

        <h3 className="text-xl font-medium text-black tracking-tight mb-2">
          Unfinished Task from Yesterday
        </h3>

        <div className="bg-gray-50 rounded-2xl p-4 my-4 border border-black/5 text-left">
          <p className="font-semibold text-black text-base mb-1">{currentTask.title}</p>
          <div className="flex items-center gap-2 text-xs text-black/50">
            <span>{currentTask.durationMinutes}m</span>
            <span>•</span>
            <span className="uppercase">{currentTask.phase}</span>
          </div>
        </div>

        <p className="text-xs text-black/60 mb-6">
          How would you like to handle this item today?
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onKeepForToday(currentTask.id)}
            className="w-full bg-black text-white text-xs font-semibold py-3.5 rounded-full shadow-sm hover:bg-black/90 transition-colors"
          >
            Keep for Today
          </button>

          <button
            type="button"
            onClick={() => onMoveToBacklog(currentTask.id)}
            className="w-full bg-gray-100 text-black text-xs font-semibold py-3.5 rounded-full hover:bg-gray-200 transition-colors"
          >
            Move to Backlog
          </button>

          <button
            type="button"
            onClick={() => onDropTask(currentTask.id)}
            className="w-full text-red-500 text-xs font-medium py-2 hover:text-red-600 transition-colors"
          >
            Drop / Delete
          </button>
        </div>
      </div>
    </div>
  )
}