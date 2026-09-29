import { useRoute } from 'wouter'
import type { AppTask, Horizon } from '../types'

interface FocusViewProps {
  tasks: AppTask[]
  horizons: Horizon[]
  onToggleTask: (id: string) => void
}

export function FocusView({ tasks, horizons, onToggleTask }: FocusViewProps) {
  const [, params] = useRoute('/focus/:id')
  const taskId = params?.id

  const task = tasks.find((t) => t.id === taskId)
  if (!task) {
    return (
      <div className="p-8 text-center text-xs text-black/50">
        Task not found or completed.
      </div>
    )
  }

  const linkedHorizon = horizons.find((h) => h.id === task.horizonId)

  let horizonProgress = 0
  let totalHorizonTasks = 0
  let completedHorizonTasks = 0

  if (linkedHorizon) {
    const horizonTasks = tasks.filter((t) => t.horizonId === linkedHorizon.id)
    totalHorizonTasks = horizonTasks.length
    completedHorizonTasks = horizonTasks.filter((t) => t.isCompleted).length
    horizonProgress = totalHorizonTasks > 0 ? Math.round((completedHorizonTasks / totalHorizonTasks) * 100) : 0
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 animate-in fade-in duration-300">
      {linkedHorizon && (
        <div className="bg-emerald-950 text-emerald-100 rounded-[2rem] p-6 space-y-3 shadow-lg">
          <div className="flex justify-between items-center text-xs font-semibold tracking-wider text-emerald-400 uppercase">
            <span>Macro Horizon Goal</span>
            <span>{horizonProgress}% Complete</span>
          </div>

          <h3 className="text-xl font-bold">{linkedHorizon.title}</h3>

          <div className="w-full h-2 bg-emerald-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${horizonProgress}%` }}
            />
          </div>

          <p className="text-xs text-emerald-300/70">
            {completedHorizonTasks} of {totalHorizonTasks} related tasks completed
          </p>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-black/5 text-center space-y-6">
        <span className="text-[10px] font-bold tracking-wider uppercase bg-black text-white px-3 py-1 rounded-full">
          Deep Focus
        </span>

        <h2 className="text-2xl font-semibold text-black">{task.title}</h2>

        {task.description && (
          <p className="text-sm text-black/60 font-medium">{task.description}</p>
        )}

        <div className="flex justify-center items-center gap-3">
          <span className="text-sm font-semibold bg-gray-100 text-black px-4 py-2 rounded-full">
            {task.durationMinutes} Minutes
          </span>
          <span className="text-sm font-semibold bg-gray-100 text-black px-4 py-2 rounded-full uppercase">
            {task.phase}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleTask(task.id)}
          className="w-full bg-emerald-600 text-white font-medium py-4 rounded-full shadow-lg hover:bg-emerald-500 transition-colors cursor-pointer"
        >
          Complete Task
        </button>
      </div>
    </div>
  )
}