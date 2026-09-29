import { useState, useMemo } from 'react'
import type { AppTask, Habit, Horizon } from '../types'
import { DailyProgress } from '../components/DailyProgress'
import { TaskCard } from '../components/TaskCard'

interface TodayViewProps {
  tasks: AppTask[]
  habits?: Habit[]
  horizons?: Horizon[]
  toggleTask: (id: string) => void
  toggleHabit?: (id: string) => void
  currentDateStr: string
  onChangeDate: (offset: number) => void
  onOpenPlanner?: () => void
}

const PHASE_CAPACITIES = {
  MORNING: 180,   // 3 Hours
  AFTERNOON: 180, // 3 Hours
  EVENING: 90,    // 1.5 Hours
}

export function TodayView({
  tasks,
  habits = [],
  horizons = [],
  toggleTask,
  toggleHabit,
  currentDateStr,
  onChangeDate,
  onOpenPlanner,
}: TodayViewProps) {
  const [selectedPhase, setSelectedPhase] = useState<'MORNING' | 'AFTERNOON' | 'EVENING'>('MORNING')
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false)

  const horizonMap = useMemo(() => {
    return new Map(horizons.map((h) => [h.id, h]))
  }, [horizons])

  const activePhaseTasks = tasks.filter((t) => !t.isCompleted && t.phase === selectedPhase)
  const activePhaseHabits = habits.filter((h) => (h.phase || 'MORNING') === selectedPhase)
  const completedTasks = tasks.filter((t) => t.isCompleted)

  const totalTaskMins = activePhaseTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0)
  const totalHabitMins = activePhaseHabits.reduce((acc, h) => acc + (h.durationMinutes || 15), 0)
  const usedPhaseMins = totalTaskMins + totalHabitMins
  const targetPhaseMins = PHASE_CAPACITIES[selectedPhase]
  const capacityPercent = Math.min(Math.round((usedPhaseMins / targetPhaseMins) * 100), 100)
  const isOvercapacity = usedPhaseMins > targetPhaseMins

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[2.6rem] font-medium text-black leading-tight tracking-tight">
            Dec's<br />Life OS
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Minimalist AI Plan My Day Button */}
          <button
            type="button"
            onClick={onOpenPlanner}
            className="h-10 px-4 bg-white hover:bg-black hover:text-white text-black transition-all duration-200 rounded-full text-xs font-semibold border border-black/5 shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 group"
          >
            <svg
              className="w-3.5 h-3.5 text-black/60 group-hover:text-white transition-colors"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L14.26 8.74L21 11L14.26 13.26L12 20L9.74 13.26L3 11L9.74 8.74L12 2Z" />
            </svg>
            <span>Plan My Day</span>
          </button>

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-white text-black font-semibold flex items-center justify-center text-xs shadow-sm border border-black/5 shrink-0">
            DC
          </div>
        </div>
      </div>

      {/* Phase Selector Tabs */}
      <div className="bg-black/10 p-1.5 rounded-full flex items-center justify-between mb-4 backdrop-blur-sm">
        {(['MORNING', 'AFTERNOON', 'EVENING'] as const).map((phase) => {
          const label = phase === 'MORNING' ? 'Morning' : phase === 'AFTERNOON' ? 'Afternoon' : 'Evening'
          const isSelected = selectedPhase === phase

          return (
            <button
              key={phase}
              type="button"
              onClick={() => setSelectedPhase(phase)}
              className={`flex-1 py-3 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer ${
                isSelected ? 'bg-black text-white shadow-md' : 'text-black/70 hover:text-black'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Energy & Phase Capacity Budget Bar */}
      <div className="bg-white/60 border border-black/5 rounded-2xl p-3.5 mb-8">
        <div className="flex justify-between items-center text-xs font-medium mb-1.5">
          <span className="text-black/60">
            {selectedPhase} Capacity: <strong className="text-black">{usedPhaseMins}m / {targetPhaseMins}m</strong>
          </span>
          {isOvercapacity ? (
            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
              Overcommitted +{usedPhaseMins - targetPhaseMins}m
            </span>
          ) : (
            <span className="text-[10px] font-medium text-black/40">
              {targetPhaseMins - usedPhaseMins}m remaining
            </span>
          )}
        </div>
        <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isOvercapacity ? 'bg-rose-500' : 'bg-black'
            }`}
            style={{ width: `${capacityPercent}%` }}
          />
        </div>
      </div>

      {/* Daily Progress Card */}
      <DailyProgress tasks={tasks} currentDateStr={currentDateStr} onChangeDate={onChangeDate} />

      {/* Interleaved Active Feed */}
      <div className="space-y-4 mb-8">
        {/* Active Phase Habits */}
        {activePhaseHabits.map((habit) => (
          <div
            key={`habit-${habit.id}`}
            onClick={() => toggleHabit?.(habit.id)}
            className={`rounded-[2rem] p-5 flex items-center justify-between cursor-pointer transition-colors ${
              habit.isCompletedToday
                ? 'bg-black/5 text-gray-500 line-through'
                : 'bg-[#E0E7FF] hover:bg-[#d5deff] text-indigo-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold tracking-wider uppercase bg-indigo-900/10 text-indigo-900 px-2.5 py-1 rounded-full">
                Habit
              </span>
              <span className="text-sm font-medium">{habit.title}</span>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 border-indigo-950 flex items-center justify-center ${habit.isCompletedToday ? 'bg-indigo-950' : ''}`}>
              {habit.isCompletedToday && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        ))}

        {/* Active Phase Tasks */}
        {activePhaseTasks.length === 0 && activePhaseHabits.length === 0 ? (
          <div className="bg-white/40 border border-dashed border-black/10 rounded-[2rem] p-8 text-center text-xs font-medium text-black/50">
            No active items for {selectedPhase.toLowerCase()}. Press + or Cmd+K to capture!
          </div>
        ) : (
          activePhaseTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              horizon={task.horizonId ? horizonMap.get(task.horizonId) : undefined}
              onToggle={toggleTask}
            />
          ))
        )}
      </div>

      {/* Collapsible Completed Section */}
      {completedTasks.length > 0 && (
        <div className="pt-4 border-t border-black/10">
          <button
            type="button"
            onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
            className="flex items-center justify-between w-full px-2 py-2 text-xs font-medium text-black/60 hover:text-black transition-colors cursor-pointer"
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
                <TaskCard
                  key={task.id}
                  task={task}
                  horizon={task.horizonId ? horizonMap.get(task.horizonId) : undefined}
                  onToggle={toggleTask}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}