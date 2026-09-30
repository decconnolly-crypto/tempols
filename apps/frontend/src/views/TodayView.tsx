import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'wouter'
import type { AppTask, Habit, Horizon, Commitment } from '../types'
import { TaskCard } from '../components/TaskCard'
import { DaySummaryCard } from '../components/DaySummaryCard'
import { CommitmentCard } from '../components/CommitmentCard'
import { DailyHero } from '../components/DailyHero'

interface TodayViewProps {
  tasks: AppTask[]
  habits?: Habit[]
  horizons?: Horizon[]
  commitments?: Commitment[]
  toggleTask: (id: string) => void
  toggleHabit?: (id: string) => void
  currentDateStr: string
  onChangeDate: (offset: number) => void
  onOpenPlanner?: () => void
  onOpenTaskActions?: (task: AppTask) => void
  onOpenCommitmentCreate?: () => void
  onOpenWeeklyView?: () => void
  onCommitmentClick?: (commitment: Commitment) => void
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

export function TodayView({
  tasks,
  habits = [],
  horizons = [],
  commitments = [],
  toggleTask,
  toggleHabit,
  currentDateStr,
  onChangeDate,
  onOpenPlanner,
  onOpenTaskActions,
  onOpenCommitmentCreate,
  onOpenWeeklyView,
  onCommitmentClick,
}: TodayViewProps) {
  const [selectedPhase, setSelectedPhase] = useState<Phase>(currentPhase())
  const [completedSheetOpen, setCompletedSheetOpen] = useState(false)
  const [heroCollapsed, setHeroCollapsed] = useState(false)

  const [, setLocation] = useLocation()
  // Collapse the hero after scrolling ~120px. The hero's container keeps
  // a fixed height so the document doesn't shrink — no scroll jump.
  useEffect(() => {
    const handleScroll = () => {
      setHeroCollapsed(window.scrollY > 120)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const horizonMap = useMemo(() => new Map(horizons.map((h) => [h.id, h])), [horizons])

  const phaseStats = useMemo(() => {
    return PHASES.reduce<Record<Phase, { count: number; mins: number }>>(
      (acc, p) => {
        const phaseTasks = tasks.filter((t) => !t.isCompleted && t.phase === p)
        const phaseHabits = habits.filter(
          (h) => (h.phase || 'MORNING') === p && !h.isCompletedToday
        )
        const mins =
          phaseTasks.reduce((s, t) => s + (t.durationMinutes || 0), 0) +
          phaseHabits.reduce((s, h) => s + (h.durationMinutes || 15), 0)
        acc[p] = {
          count: phaseTasks.length + phaseHabits.length,
          mins,
        }
        return acc
      },
      {
        MORNING: { count: 0, mins: 0 },
        AFTERNOON: { count: 0, mins: 0 },
        EVENING: { count: 0, mins: 0 },
      }
    )
  }, [tasks, habits])

  const activePhaseTasks = tasks.filter((t) => !t.isCompleted && t.phase === selectedPhase)
  const activePhaseHabits = habits.filter((h) => (h.phase || 'MORNING') === selectedPhase)
  const completedTasks = tasks.filter((t) => t.isCompleted)

  const totalToday = tasks.length
  const completedToday = completedTasks.length

  const sortedCommitments = useMemo(
    () => [...commitments].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [commitments]
  )

  return (
    <div className="animate-in fade-in duration-300">
      {/* Daily hero */}
      <DailyHero
        currentDateStr={currentDateStr}
        tasks={tasks}
        commitments={commitments}
        habits={habits}
        collapsed={heroCollapsed}
      />
   
      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 mb-5">
        <button
          type="button"
          onClick={onOpenPlanner}
          className="h-9 px-3.5 bg-white/60 backdrop-blur-xl hover:bg-white/80 text-black transition-all duration-200 rounded-full text-[11px] font-semibold border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-1.5 active:scale-95"
        >
          <svg className="w-3 h-3 text-black/60" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L14.26 8.74L21 11L14.26 13.26L12 20L9.74 13.26L3 11L9.74 8.74L12 2Z" />
          </svg>
          <span>Plan</span>
        </button>

        <button
          type="button"
          onClick={() => setCompletedSheetOpen(true)}
          className="h-9 px-3 bg-white/60 backdrop-blur-xl text-black rounded-full text-[11px] font-semibold border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-1 active:scale-95 transition-transform"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>
            {completedToday}/{totalToday}
          </span>
        </button>
      </div>

      {/* Commitments strip */}
      {sortedCommitments.length === 0 && onOpenCommitmentCreate && (
        <div className="mb-5">
          <button
            type="button"
            onClick={onOpenCommitmentCreate}
            className="w-full bg-white/40 backdrop-blur-xl border border-dashed border-white/60 rounded-2xl py-3 px-4 text-center text-[11px] font-medium text-black/45 hover:bg-white/60 hover:text-black/70 transition-colors"
          >
            No commitments today. Tap to add one.
          </button>
        </div>
      )}

      {sortedCommitments.length > 0 && (
        <div className="mb-5 space-y-2">
          {sortedCommitments.map((c, index) => {
            const isLast = index === sortedCommitments.length - 1
            return (
              <CommitmentCard
                key={`${c.id}-${c.occurrenceDate}`}
                commitment={c}
                onClick={onCommitmentClick}
                showActions={isLast}
                onOpenWeeklyView={isLast ? onOpenWeeklyView : undefined}
                onAddCommitment={isLast ? onOpenCommitmentCreate : undefined}
              />
            )
          })}
        </div>
      )}

      <DaySummaryCard
        tasks={tasks}
        onOpenTask={(t) => setLocation(`/focus/${t.id}`)}
        onOpenPlanner={onOpenPlanner}
      />

      {/* Phase tabs */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/50 rounded-2xl p-1 flex items-stretch mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        {PHASES.map((phase) => {
          const isSelected = selectedPhase === phase
          const stat = phaseStats[phase]
          return (
            <button
              key={phase}
              type="button"
              onClick={() => setSelectedPhase(phase)}
              className={`flex-1 py-2.5 px-1 rounded-xl transition-all duration-200 text-center ${
                isSelected
                  ? 'bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                  : 'text-black/55 hover:text-black/80'
              }`}
            >
              <div
                className={`text-[12px] font-semibold leading-tight ${
                  isSelected ? 'text-black' : ''
                }`}
              >
                {phaseLabel(phase)}
              </div>
              <div
                className={`text-[10px] font-medium leading-tight mt-0.5 ${
                  isSelected ? 'text-black/50' : 'text-black/35'
                }`}
              >
                {stat.count === 0 ? '—' : `${stat.count} · ${formatMins(stat.mins)}`}
              </div>
            </button>
          )
        })}
      </div>

      {/* Habits strip */}
      {activePhaseHabits.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {activePhaseHabits.map((habit) => (
            <button
              key={`habit-${habit.id}`}
              type="button"
              onClick={() => toggleHabit?.(habit.id)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-medium transition-all active:scale-95 flex items-center gap-2 backdrop-blur-xl border ${
                habit.isCompletedToday
                  ? 'bg-white/35 border-white/40 text-black/40'
                  : 'bg-[#E0E7FF]/70 border-[#E0E7FF]/60 text-indigo-950 hover:bg-[#E0E7FF]/85'
              }`}
            >
              <span className={habit.isCompletedToday ? 'line-through' : ''}>
                {habit.title}
              </span>
              {habit.streak > 0 && (
                <span
                  className={`text-[10px] font-bold ${
                    habit.isCompletedToday ? 'text-black/30' : 'text-indigo-900/50'
                  }`}
                >
                  🔥{habit.streak}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Task list */}
      <div className="space-y-3 mb-6">
        {activePhaseTasks.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-xl border border-dashed border-white/60 rounded-[1.75rem] py-6 px-5 text-center">
            <p className="text-[12px] font-medium text-black/45">
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

      {/* Day navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => onChangeDate(-1)}
          className="text-[11px] font-medium text-black/45 hover:text-black transition-colors flex items-center gap-1"
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
          className="text-[11px] font-medium text-black/45 hover:text-black transition-colors flex items-center gap-1"
        >
          Tomorrow
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Completed sheet */}
      {completedSheetOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setCompletedSheetOpen(false)}
          />
          <div className="relative bg-white/80 backdrop-blur-2xl w-full max-w-md rounded-t-[2rem] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200 max-h-[70vh] overflow-y-auto border-t border-white/60">
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
              <p className="text-[12px] text-black/40 text-center py-6">
                Nothing completed yet.
              </p>
            ) : (
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl p-3.5 flex items-center justify-between"
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