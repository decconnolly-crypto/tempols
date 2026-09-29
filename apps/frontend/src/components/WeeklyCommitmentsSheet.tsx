import { useState, useEffect } from 'react'
import type { Commitment } from '../types'
import { CommitmentCard } from './CommitmentCard'

interface WeeklyCommitmentsSheetProps {
  isOpen: boolean
  initialWeekStart: string
  onClose: () => void
  onCommitmentClick?: (commitment: Commitment) => void
  onAddCommitment?: () => void
}

function formatDateStr(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr)
  d.setDate(d.getDate() + days)
  return formatDateStr(d)
}

function mondayOf(dateStr: string): string {
  const d = parseDateStr(dateStr)
  const day = d.getDay() // 0 = Sunday, 1 = Monday, ...
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return formatDateStr(d)
}

function dayLabel(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return d.toLocaleDateString('en-GB', { weekday: 'short' })
}

function dayNumber(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return String(d.getDate())
}

function monthLabel(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return d.toLocaleDateString('en-GB', { month: 'short' })
}

function isToday(dateStr: string): boolean {
  return formatDateStr(new Date()) === dateStr
}

export function WeeklyCommitmentsSheet({
  isOpen,
  initialWeekStart,
  onClose,
  onCommitmentClick,
  onAddCommitment,
}: WeeklyCommitmentsSheetProps) {
  const [weekStart, setWeekStart] = useState<string>(mondayOf(initialWeekStart))
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setWeekStart(mondayOf(initialWeekStart))
  }, [isOpen, initialWeekStart])

  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    fetch(`/api/commitments/week?start=${weekStart}`)
      .then((res) => res.json())
      .then((data) => {
        setCommitments(data.commitments || [])
      })
      .catch((err) => {
        console.error('Weekly commitments fetch error:', err)
        setCommitments([])
      })
      .finally(() => setLoading(false))
  }, [isOpen, weekStart])

  if (!isOpen) return null

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const commitmentsByDay: Record<string, Commitment[]> = {}
  for (const day of days) commitmentsByDay[day] = []
  for (const c of commitments) {
    if (commitmentsByDay[c.occurrenceDate]) {
      commitmentsByDay[c.occurrenceDate].push(c)
    }
  }

  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${monthLabel(weekStart)} ${dayNumber(weekStart)} – ${monthLabel(
    weekEnd
  )} ${dayNumber(weekEnd)}`

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-md rounded-t-[2rem] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 bg-black/15 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="text-base font-medium text-black">This Week</h2>
            <p className="text-[11px] font-medium text-black/40">{weekLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {loading ? (
          <p className="text-[12px] text-black/40 text-center py-8">Loading...</p>
        ) : (
          <div className="space-y-3">
            {days.map((day) => {
              const dayCommitments = commitmentsByDay[day]
              const today = isToday(day)
              return (
                <div key={day} className="flex gap-3">
                  {/* Day label */}
                  <div className="w-12 shrink-0 pt-1 text-center">
                    <div
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        today ? 'text-black' : 'text-black/40'
                      }`}
                    >
                      {dayLabel(day)}
                    </div>
                    <div
                      className={`text-lg font-medium leading-tight ${
                        today
                          ? 'text-white bg-black w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-0.5'
                          : 'text-black/70'
                      }`}
                    >
                      {dayNumber(day)}
                    </div>
                  </div>

                  {/* Commitments */}
                  <div className="flex-1 min-w-0 space-y-2 pb-1">
                    {dayCommitments.length === 0 ? (
                      <div className="text-[11px] text-black/25 py-1.5">—</div>
                    ) : (
                      dayCommitments.map((c) => (
                        <CommitmentCard
                          key={`${c.id}-${c.occurrenceDate}`}
                          commitment={c}
                          onClick={onCommitmentClick}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {onAddCommitment && (
          <button
            type="button"
            onClick={() => {
              onAddCommitment()
              onClose()
            }}
            className="w-full mt-5 bg-black text-white text-[13px] font-semibold py-3.5 rounded-full hover:bg-black/80 transition-colors"
          >
            + Add commitment
          </button>
        )}
      </div>
    </div>
  )
}