import { useState } from 'react'
import type { AppTask } from '../../types'
import { DailyProgress } from '../DailyProgress'
import { TaskCard } from '../TaskCard'

export function TodayView({
  tasks,
  toggleTask,
  currentDateStr,
  onChangeDate,
}: {
  tasks: AppTask[]
  toggleTask: (id: string) => void
  currentDateStr: string
  onChangeDate: (offset: number) => void
}) {
  const [selectedPhase, setSelectedPhase] = useState<'MORNING' | 'AFTERNOON' | 'EVENING'>('MORNING')
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false)

  const activePhaseTasks = tasks.filter((t) => !t.isCompleted && t.phase === selectedPhase)
  const completedTasks = tasks.filter((t) => t.isCompleted)

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[2.6rem] font-medium text-black leading-tight tracking-tight">
          Dec's<br />Life OS
        </h1>
        <div className="w-12 h-12 rounded-full bg-white text-black font-semibold flex items-center justify-center text-sm shadow-sm border border-black/5">
          DC
        </div>
      </div>

      <div className="bg-black/10 p-1.5 rounded-full flex items-center justify-between mb-8 backdrop-blur-sm">
        {(['MORNING', 'AFTERNOON', 'EVENING'] as const).map((phase) => {
          const label = phase === 'MORNING' ? 'Morning' : phase === 'AFTERNOON' ? 'Afternoon' : 'Evening'
          const isSelected = selectedPhase === phase

          return (
            <button
              key={phase}
              onClick={() => setSelectedPhase(phase)}
              className={`flex-1 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                isSelected ? 'bg-black text-white shadow-md' : 'text-black/70 hover:text-black'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <DailyProgress tasks={tasks} currentDateStr={currentDateStr} onChangeDate={onChangeDate} />

      <div className="space-y-4 mb-8">
        {activePhaseTasks.length === 0 ? (
          <div className="bg-white/40 border border-dashed border-black/10 rounded-[2rem] p-8 text-center text-xs font-medium text-black/50">
            No active tasks for {selectedPhase.toLowerCase()}. Press + or Cmd+K to capture!
          </div>
        ) : (
          activePhaseTasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={toggleTask} />
          ))
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="pt-4 border-t border-black/10">
          <button
            onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
            className="flex items-center justify-between w-full px-2 py-2 text-xs font-medium text-black/60 hover:text-black transition-colors"
          >
            <span className="uppercase tracking-wider">Completed ({completedTasks.length})</span>
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
            <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}