import type { AppTask } from '../types'
import { formatReadableDate } from '../utils/date'

export function DailyProgress({
  tasks,
  currentDateStr,
  onChangeDate,
}: {
  tasks: AppTask[]
  currentDateStr: string
  onChangeDate: (offset: number) => void
}) {
  const total = tasks.length
  const completedCount = tasks.filter((task) => task.isCompleted).length
  const percentage = total === 0 ? 0 : Math.round((completedCount / total) * 100)

  const callsCount = tasks.filter((t) => t.tags.includes('meeting') || t.tags.includes('call')).length
  const totalFocusMinutes = tasks.reduce((sum, t) => sum + t.durationMinutes, 0)
  const focusHours = Math.round((totalFocusMinutes / 60) * 10) / 10

  return (
    <div className="bg-white rounded-[2.5rem] p-7 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[1.1rem] font-medium text-black tracking-tight">{formatReadableDate(currentDateStr)}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => onChangeDate(-1)}
            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => onChangeDate(1)}
            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-baseline justify-center gap-1 mb-2">
        <span className="text-[6.5rem] font-medium text-black leading-none tracking-tighter">{completedCount}</span>
        <span className="text-[2.5rem] font-medium text-black">/{total}</span>
      </div>
      <p className="text-[13px] text-gray-500 font-medium text-center mb-6">Tasks completed ({percentage}%)</p>

      <div className="w-full flex justify-center items-center gap-2 mb-6">
        {tasks.length === 0 ? (
          <span className="text-xs text-gray-400 font-medium py-1">No tasks scheduled for this day</span>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`h-3.5 transition-all duration-300 rounded-full ${
                task.isCompleted ? 'w-12 bg-black' : 'w-3.5 bg-gray-200'
              }`}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-center gap-6 text-xs font-medium text-black/70 border-t border-gray-100 pt-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-black" />
          <span>{callsCount} Tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-300" />
          <span>{focusHours}h Focus</span>
        </div>
      </div>
    </div>
  )
}