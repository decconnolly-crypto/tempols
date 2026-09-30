import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'wouter'
import type { AppTask, Habit, Horizon, Commitment } from '../types'
import { TaskCard } from '../components/TaskCard'
import { DaySummaryCard } from '../components/DaySummaryCard'
import { CommitmentCard } from '../components/CommitmentCard'
import { DailyHero } from '../components/DailyHero'

type Phase = 'MORNING' | 'AFTERNOON' | 'EVENING'

interface TodayViewProps {
  tasks: AppTask[]
  habits?: Habit[]
  horizons?: Horizon[]
  commitments?: Commitment[]
  toggleTask: (id: string) => void
  toggleHabit?: (id: string) => void
  currentDateStr: string
  onChangeDate: (offset: number) => void
  onGoToToday: () => void
  onOpenPlanner?: () => void
  onOpenTaskActions?: (task: AppTask) => void
  onOpenCommitmentCreate?: () => void
  onOpenWeeklyView?: () => void
  onCommitmentClick?: (commitment: Commitment) => void
  selectedPhase: Phase
  onSelectPhase: (phase: Phase) => void
}

const PHASES = ['MORNING', 'AFTERNOON', 'EVENING'] as const

function phaseLabel(p: Phase): string {
  return p === 'MORNING' ? 'Morning' : p === 'AFTERNOON' ? 'Afternoon' : 'Evening'
}

function formatMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
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
  onGoToToday,
  onOpenPlanner,
  onOpenTaskActions,
  onOpenCommitmentCreate,
  onOpenWeeklyView,
  onCommitmentClick,
  selectedPhase,
  onSelectPhase,
}: TodayViewProps) {
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

  const horizonMap = useMemo(
    () => new Map(horizons.map((h) => [h.id, h])),
    [horizons]
  )

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

  const activePhaseTasks = tasks.filter(
    (t) => !t.isCompleted && t.phase === selectedPhase
  )
  const activePhaseHabits = habits.filter(
    (h) => (h.phase || 'MORNING') === selectedPhase
  )

  const sortedCommitments = useMemo(
    () => [...commitments].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [commitments]
  )

  return (
    <div className="animate-in fade-in duration-300">
      <DailyHero
        currentDateStr={currentDateStr}
        tasks={tasks}
        commitments={commitments}
        habits={habits}
        collapsed={heroCollapsed}
        onOpenPlanner={onOpenPlanner}
        onPreviousDay={() => onChangeDate(-1)}
        onNextDay={() => onChangeDate(1)}
        onGoToToday={onGoToToday}
      />

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
              onClick={() => onSelectPhase(phase)}
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
                {stat.count === 0
                  ? '—'
                  : `${stat.count} · ${formatMins(stat.mins)}`}
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
              className={`px-3.5 py-2 rounded-full text-[12px] font-medium transition-all active:scale-95 flex items-center gap-2 backdrop-blur-xl border overflow-hidden relative ${
                habit.isCompletedToday
                  ? 'bg-black/40 border-white/10 text-white/60'
                  : 'bg-black/75 border-white/10 text-white shadow-[0_2px_12px_rgba(0,0,0,0.12)]'
              }`}
            >
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

              <span
                className={`relative w-3.5 h-3.5 shrink-0 ${
                  habit.isCompletedToday ? 'opacity-50' : 'opacity-80'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-full h-full"
                >
                  <path d="M21 12a9 9 0 1 1-3.51-7.13" />
                  <path d="M21 3v6h-6" />
                </svg>
              </span>

              <span
                className={`relative ${
                  habit.isCompletedToday ? 'line-through' : ''
                }`}
              >
                {habit.title}
              </span>

              {habit.streak > 0 && (
                <span
                  className={`relative text-[10px] font-bold ${
                    habit.isCompletedToday ? 'text-white/40' : 'text-white/60'
                  }`}
                >
                  {habit.streak}
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
              horizon={
                task.horizonId ? horizonMap.get(task.horizonId) : undefined
              }
              onToggle={toggleTask}
              onLongPress={onOpenTaskActions}
            />
          ))
        )}
      </div>
      {/* Day navigation removed — now lives in the hero */}
    </div>
  )
}