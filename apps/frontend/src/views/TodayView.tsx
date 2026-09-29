import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'wouter'
import type { AppTask, Habit, Horizon } from '../types'
import { TaskCard } from '../components/TaskCard'
import { DaySummaryCard } from '../components/DaySummaryCard'

interface TodayViewProps {
  tasks: AppTask[]
  habits?: Habit[]
  horizons?: Horizon[]
  toggleTask: (id: string) => void
  toggleHabit?: (id: string) => void
  currentDateStr: string
  onChangeDate: (offset: number) => void
  onOpenPlanner?: () => void
  onOpenTaskActions?: (task: AppTask) => void
}

const PHASES = ['MORNING', 'AFTERNOON', 'EVENING'] as const
type Phase = (typeof PHASES)[number]

function currentPhase(): Phase {
  const h = new Date().getHours()
  if (h < 12) return 'MORNING'
  if (h < 17) return 'AFTERNOON'
  return 'EVENING'
}

function phaseLabel(p: Phase): string {
  return p === 'MORNING' ? 'Morning' : p === 'AFTERNOON' ? 'Afternoon' : 'Evening'
}

function formatMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function isToday(dateStr: string): boolean {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}` === dateStr
}

function formatHeaderDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
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
  onOpenTaskActions,
}: TodayViewProps) {
  const [selectedPhase, setSelectedPhase] = useState<Phase>(currentPhase())
  const [completedSheetOpen, setCompletedSheetOpen] = useState(false)
  const [greeting, setGreeting] = useState<string | null>(null)

  const [, setLocation] = useLocation()

  // First-visit-of-the-day greeting
  useEffect(() => {
    const key = 'tempols:lastGreetingDate'
    const today = currentDateStr
    if (localStorage.getItem(key) !== today) {
      const h = new Date().getHours()
      const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
      setGreeting(g)
      localStorage.setItem(key, today)
    }
  }, [currentDateStr])

  const horizonMap = useMemo(() => new Map(horizons.map((h) => [h.id, h])), [horizons])

  // Per-phase counts, for the tabs
  const phaseStats = useMemo(() => {
    return PHASES.reduce<Record<Phase, { count: number; mins: number }>>(
      (acc, p) => {
        const phaseTasks = tasks.filter((t) => !t.isCompleted && t.phase === p)
        const phaseHabits = habits.filter((h) => (h.phase || 'MORNING') === p && !h.isCompletedToday)
        const mins =
          phaseTasks.reduce((s, t) => s + (t.durationMinutes || 0), 0) +
          phaseHabits.reduce((s, h) => s + (h.durationMinutes || 15), 0)
        acc[p] = {
          count: phaseTasks.length + phaseHabits.length,
          mins,
        }
        return acc
      },
      { MORNING: { count: 0, mins: 0 }, AFTERNOON: { count: 0, mins: 0 }, EVENING: { count: 0, mins: 0 } }
    )
  }, [tasks, habits])

  const activePhaseTasks = tasks.filter((t) => !t.isCompleted && t.phase === selectedPhase)
  const activePhaseHabits = habits.filter((h) => (h.phase || 'MORNING') === selectedPhase)
  const completedTasks = tasks.filter((t) => t.isCompleted)

  const totalToday = tasks.length
  const completedToday = completedTasks.length

  return (
    <div className="animate-in fade-in duration-300">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0">
          {greeting && (
            <p className="text-[13px] font-medium text-black/50 mb-0.5">{greeting}, Dec.</p>
          )}
          <h1 className="text-2xl font-medium text-black tracking-tight leading-tight">
            {formatHeaderDate(currentDateStr)}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenPlanner}
            className="h-9 px-3.5 bg-white hover:bg-black hover:text-white text-black transition-all duration-200 rounded-full text-[11px] font-semibold border border-black/5 shadow-sm flex items-center gap-1.5 active:scale-95 group"
          >
            <svg
              className="w-3 h-3 text-black/60 group-hover:text-white transition-colors"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L14.26 8.74L21 11L14.26 13.26L12 20L9.74 13.26L3 11L9.74 8.74L12 2Z" />
            </svg>
            <span>Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setCompletedSheetOpen(true)}
            className="h-9 px-3 bg-white text-black rounded-full text-[11px] font-semibold border border-black/5 shadow-sm flex items-center gap-1 active:scale-95 transition-transform"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {completedToday}/{totalToday}
            </span>
          </button>
        </div>
      </div>

      {/* ─── Day Summary Card ───────────────────────────── */}
      <DaySummaryCard
        tasks={tasks}
        onOpenTask={(t) => setLocation(`/focus/${t.id}`)}
        onOpenPlanner={onOpenPlanner}
      />

      {/* ─── Phase Tabs ─────────────────────────────────── */}
      <div className="bg-black/10 p-1 rounded-2xl flex items-stretch mb-6 backdrop-blur-sm">
        {PHASES.map((phase) => {
          const isSelected = selectedPhase === phase
          const stat = phaseStats[phase]
          return (
            <button
              key={phase}
              type="button"
              onClick={() => setSelectedPhase(phase)}
              className={`flex-1 py-2.5 px-1 rounded-xl transition-all duration-200 text-center ${
                isSelected ? 'bg-black text-white shadow-md' : 'text-black/60'
              }`}
            >
              <div className="text-[12px] font-semibold leading-tight">
                {phaseLabel(phase)}
              </div>
              <div
                className={`text-[10px] font-medium leading-tight mt-0.5 ${
                  isSelected ? 'text-white/60' : 'text-black/40'
                }`}
              >
                {stat.count === 0 ? '—' : `${stat.count} · ${formatMins(stat.mins)}`}
              </div>
            </button>
          )
        })}
      </div>

      {/* ─── Habits Strip ───────────────────────────────── */}
      {activePhaseHabits.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {activePhaseHabits.map((habit) => (
            <button
              key={`habit-${habit.id}`}
              type="button"
              onClick={() => toggleHabit?.(habit.id)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-medium transition-all active:scale-95 ${
                habit.isCompletedToday
                  ? 'bg-black/5 text-black/40 line-through'
                  : 'bg-[#E0E7FF] text-indigo-950 hover:bg-[#d5deff]'
              }`}
            >
              {habit.title}
              {habit.streak > 0 && !habit.isCompletedToday && (
                <span className="ml-2 text-[10px] font-bold text-indigo-900/50">
                  {habit.streak}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ─── Task List ──────────────────────────────────── */}
      <div className="space-y-3 mb-6">
        {activePhaseTasks.length === 0 ? (
          <div className="bg-white/40 border border-dashed border-black/10 rounded-[1.75rem] py-6 px-5 text-center">
            <p className="text-[12px] font-medium text-black/50">
              Nothing planned for the {phaseLabel(selectedPhase).toLowerCase()}.
            </p>
          </div>
        ) : (
          activePhaseTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              horizon={task.horizonId ? horizonMap.get(task.horizonId) : undefined}
              onToggle={toggleTask}
              onLongPress={onOpenTaskActions}
            />
          ))
        )}
      </div>

      {/* ─── Day Navigation ─────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => onChangeDate(-1)}
          className="text-[11px] font-medium text-black/40 hover:text-black transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Yesterday
        </button>
        {!isToday(currentDateStr) && (
          <button
            type="button"
            onClick={() => onChangeDate(0)}
            className="text-[11px] font-semibold text-black"
          >
            Today
          </button>
        )}
        <button
          type="button"
          onClick={() => onChangeDate(1)}
          className="text-[11px] font-medium text-black/40 hover:text-black transition-colors flex items-center gap-1"
        >
          Tomorrow
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ─── Completed Sheet ────────────────────────────── */}
      {completedSheetOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setCompletedSheetOpen(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-t-[2rem] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 bg-black/15 rounded-full" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-black">Completed today</h3>
              <button
                type="button"
                onClick={() => setCompletedSheetOpen(false)}
                className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center text-black/50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {completedTasks.length === 0 ? (
              <p className="text-[12px] text-black/40 text-center py-6">Nothing completed yet.</p>
            ) : (
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-black/5 rounded-2xl p-3.5 flex items-center justify-between"
                  >
                    <span className="text-[13px] font-medium text-black/60 line-through truncate pr-3">
                      {task.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className="text-[10px] font-semibold uppercase tracking-wider text-black/40 hover:text-black shrink-0"
                    >
                      Undo
                    </button>
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