import { useLocation } from 'wouter'
import type { AppTask, Horizon } from '../types'

function getTaskTheme(tags: string[]) {
  if (tags.includes('personal') || tags.includes('life')) {
    return 'bg-[#D6E5E0] hover:bg-[#cbe0d9]' // Soft Sage
  }
  if (tags.includes('health') || tags.includes('fitness')) {
    return 'bg-[#E5D6DC] hover:bg-[#dfcbcf]' // Muted Rose
  }
  // Default / Work / Agency
  return 'bg-[#E5DCD6] hover:bg-[#dfd5ce]' // Warm Sand
}

interface TaskCardProps {
  task: AppTask
  horizon?: Horizon
  onToggle: (id: string) => void
}

export function TaskCard({ task, horizon, onToggle }: TaskCardProps) {
  const [, setLocation] = useLocation()

  if (task.isCompleted) {
    return (
      <div className="bg-black/5 rounded-[2rem] p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onToggle(task.id)}
            className="min-w-[22px] h-5 w-5 rounded-full bg-black flex items-center justify-center cursor-pointer"
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-500 line-through">{task.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {horizon && (
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              {horizon.title}
            </span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="text-[11px] font-medium text-gray-400">#{tag}</span>
          ))}
        </div>
      </div>
    )
  }

  const colorStyle = getTaskTheme(task.tags)

  return (
    <div
      onClick={() => setLocation(`/focus/${task.id}`)}
      className={`${colorStyle} rounded-[2rem] p-6 flex items-start gap-4 cursor-pointer transition-colors relative`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(task.id)
        }}
        className="mt-0.5 min-w-[24px] h-6 w-6 rounded-full border-[2px] border-black flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer"
      />
      <div className="flex-1 pr-4">
        <h3 className="text-base font-medium text-black mb-2">{task.title}</h3>
        {task.description && <p className="text-[13px] font-medium text-black/60 mb-4">{task.description}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-black bg-black/5 px-3 py-1.5 rounded-full">
            {task.durationMinutes}m
          </span>
          {horizon && (
            <span className="text-xs font-semibold text-black bg-black/10 px-3 py-1.5 rounded-full">
              {horizon.title}
            </span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="text-xs font-medium text-black bg-black/5 px-3 py-1.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}