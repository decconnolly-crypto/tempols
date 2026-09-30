import { useEffect, useMemo, useState } from 'react'
import type { AppTask, Commitment, Habit } from '../types'

interface DailyHeroProps {
  currentDateStr: string
  tasks: AppTask[]
  commitments: Commitment[]
  habits: Habit[]
  collapsed: boolean
  onOpenPlanner?: () => void
}

type Phase = 'MORNING' | 'AFTERNOON' | 'EVENING'

function currentPhase(): Phase {
  const h = new Date().getHours()
  if (h < 12) return 'MORNING'
  if (h < 17) return 'AFTERNOON'
  return 'EVENING'
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatHeaderDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${String(m).padStart(2, '0')}${suffix}`
}

function buildBriefing(
  tasks: AppTask[],
  commitments: Commitment[],
  habits: Habit[]
): string {
  const openTasks = tasks.filter((t) => !t.isCompleted && !t.habitId)
  const openHabits = habits.filter((h) => !h.isCompletedToday)
  const sortedCommitments = [...commitments].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )
  const nextCommitment = sortedCommitments[0]

  if (
    openTasks.length === 0 &&
    sortedCommitments.length === 0 &&
    openHabits.length === 0
  ) {
    return 'Nothing on the calendar yet. A blank page — what would make today a good one?'
  }

  const parts: string[] = []

  if (openTasks.length === 1) {
    parts.push('one task')
  } else if (openTasks.length > 1) {
    parts.push(`${openTasks.length} tasks`)
  }

  if (openHabits.length === 1) {
    parts.push('one habit')
  } else if (openHabits.length > 1) {
    parts.push(`${openHabits.length} habits`)
  }

  if (nextCommitment) {
    const timeStr = formatTime(nextCommitment.startTime)
    const title = nextCommitment.title
    parts.push(`first commitment ${title} at ${timeStr}`)
  }

  if (parts.length === 0) {
    return 'Nothing scheduled today.'
  }

  const joined =
    parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1]

  return `You have ${joined}.`
}

const PHASE_GRADIENTS: Record<
  Phase,
  { core: string; glow: string; ring: string }
> = {
  MORNING: {
    core: 'radial-gradient(circle at 35% 30%, rgba(255, 226, 180, 0.95) 0%, rgba(255, 174, 105, 0.6) 40%, rgba(255, 140, 66, 0.05) 75%)',
    glow: 'rgba(255, 180, 120, 0.35)',
    ring: 'rgba(255, 210, 150, 0.5)',
  },
  AFTERNOON: {
    core: 'radial-gradient(circle at 35% 30%, rgba(220, 230, 245, 0.95) 0%, rgba(150, 180, 220, 0.55) 40%, rgba(100, 140, 200, 0.05) 75%)',
    glow: 'rgba(150, 180, 220, 0.3)',
    ring: 'rgba(180, 200, 230, 0.5)',
  },
  EVENING: {
    core: 'radial-gradient(circle at 35% 30%, rgba(210, 195, 245, 0.95) 0%, rgba(150, 130, 210, 0.55) 40%, rgba(90, 70, 160, 0.05) 75%)',
    glow: 'rgba(140, 120, 210, 0.35)',
    ring: 'rgba(180, 160, 230, 0.5)',
  },
}

export function DailyHero({
  currentDateStr,
  tasks,
  commitments,
  habits,
  collapsed,
  onOpenPlanner,
}: DailyHeroProps) {
  const [hour, setHour] = useState(new Date().getHours())

  useEffect(() => {
    const interval = setInterval(() => {
      setHour(new Date().getHours())
    }, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const phase = currentPhase()
  const gradient = PHASE_GRADIENTS[phase]
  const greeting = greetingFor(hour)
  const briefing = useMemo(
    () => buildBriefing(tasks, commitments, habits),
    [tasks, commitments, habits]
  )

  return (
    <div className="relative mb-4 h-[300px]">
      {/* Collapsed row — only rendered when collapsed */}
      {collapsed && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between animate-in fade-in duration-200">
          <p className="text-[13px] font-medium text-black/60 truncate pr-3">
            {formatHeaderDate(currentDateStr)}
          </p>
          <p className="text-[11px] font-medium text-black/40 truncate pl-3 text-right">
            {briefing}
          </p>
        </div>
      )}

      {/* Expanded content — only rendered when not collapsed */}
      {!collapsed && (
        <div className="absolute inset-x-0 top-0 flex flex-col items-center text-center animate-in fade-in duration-300 origin-top">
          {/* The orb */}
          <div
            className="relative mb-4 mt-2"
            style={{ width: 100, height: 100 }}
          >
            <div
              className="absolute inset-0 rounded-full animate-breathe-slow"
              style={{
                background: gradient.glow,
                filter: 'blur(18px)',
                transform: 'scale(1.25)',
              }}
            />
            <div
              className="absolute inset-0 rounded-full animate-shimmer"
              style={{
                background: `radial-gradient(circle, transparent 55%, ${gradient.ring} 100%)`,
                opacity: 0.5,
              }}
            />
            <div
              className="absolute inset-0 rounded-full animate-breathe"
              style={{
                background: gradient.core,
                boxShadow: `inset 0 0 20px rgba(255,255,255,0.4), 0 0 40px ${gradient.glow}`,
              }}
            />
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                top: '14%',
                left: '25%',
                width: '32%',
                height: '22%',
                background:
                  'radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
                filter: 'blur(4px)',
              }}
            />
          </div>

          {/* Date */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-black/40 mb-1.5">
            {formatHeaderDate(currentDateStr)}
          </p>

          {/* Greeting */}
          <h1 className="text-[26px] font-medium text-black tracking-tight leading-tight mb-2">
            {greeting}, Dec.
          </h1>

          {/* Briefing */}
          <p className="text-[13px] font-medium text-black/55 max-w-[280px] leading-relaxed">
            {briefing}
          </p>

          {/* Plan CTA */}
          {onOpenPlanner && (
            <button
              type="button"
              onClick={onOpenPlanner}
              className="mt-5 h-11 px-5 bg-white/70 backdrop-blur-xl hover:bg-white/90 text-black rounded-full text-[13px] font-semibold border border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center gap-2 active:scale-95 transition-transform"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L14.26 8.74L21 11L14.26 13.26L12 20L9.74 13.26L3 11L9.74 8.74L12 2Z" />
              </svg>
              <span>Plan my day</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}