import { useState, useEffect, useMemo } from 'react'
import type { Recipe } from '../types'

interface MealAssignment {
  date: string
  recipeId: string | null
  reason: string
}

interface PlanDay {
  date: string
  weekday: string
  theme: string
}

interface MealPlannerModalProps {
  isOpen: boolean
  weekStart: string
  recipes: Recipe[]
  onClose: () => void
  onCommit: (assignments: MealAssignment[]) => Promise<void>
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}


function formatDateShort(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

export function MealPlannerModal({
  isOpen,
  weekStart,
  recipes,
  onClose,
  onCommit,
}: MealPlannerModalProps) {
  const [loading, setLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<MealAssignment[]>([])
  const [days, setDays] = useState<PlanDay[]>([])
  const [swapDate, setSwapDate] = useState<string | null>(null)

  const recipeById = useMemo(() => {
    const map = new Map<string, Recipe>()
    for (const r of recipes) map.set(r.id, r)
    return map
  }, [recipes])

  // Reset state and generate a fresh plan when the modal opens
  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    setError(null)
    setReply(null)
    setAssignments([])
    setDays([])
    setSwapDate(null)

    fetch('/api/ai/plan-meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: weekStart }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          return
        }
        setReply(data.reply || null)
        setAssignments(data.assignments || [])
        setDays(data.days || [])
      })
      .catch((err) => {
        console.error('Meal planner error:', err)
        setError('Could not generate a plan. Try again.')
      })
      .finally(() => setLoading(false))
  }, [isOpen, weekStart])

  if (!isOpen) return null

  const handleSwap = (date: string, newRecipeId: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.date === date
          ? { ...a, recipeId: newRecipeId, reason: 'Swapped by you.' }
          : a
      )
    )
    setSwapDate(null)
  }

  const handleCommit = async () => {
    setCommitting(true)
    setError(null)
    try {
      await onCommit(assignments)
      onClose()
    } catch (err) {
      console.error('Commit error:', err)
      setError('Could not save the plan. Try again.')
    } finally {
      setCommitting(false)
    }
  }

  const plannedCount = assignments.filter((a) => a.recipeId).length

  // Recipes available for swapping on a given date (filter by theme category)
  const swapOptions = (date: string): Recipe[] => {
    const day = days.find((d) => d.date === date)
    if (!day) return []

    // Map theme label back to category code
    const themeCodeMap: Record<string, string> = {
      'Easy Dinner': 'EASY',
      'Pasta Night': 'PASTA',
      'Winter Warmers': 'WINTER',
      'World Foods': 'WORLD',
      'Fun Food': 'FUN',
      Fakeaway: 'FAKEAWAY',
      'Sunday Lunch': 'SUNDAY',
    }
    const code = themeCodeMap[day.theme] || 'ANY'
    return recipes.filter((r) => r.category === code || r.category === 'ANY')
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-white/80 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start px-6 pt-6 pb-4 border-b border-white/40 relative z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-black/70 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/45">
                AI Meal Planner
              </p>
            </div>
            <h2 className="text-[17px] font-medium text-black tracking-tight">
              Week of {formatDateShort(weekStart).split(',')[0]}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm border border-white/60 flex items-center justify-center text-black/50 hover:text-black transition-colors shrink-0"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 relative z-10">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-black/50 text-xs font-medium">
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Planning your week…
            </div>
          ) : error ? (
            <div className="bg-rose-50 backdrop-blur-sm border border-rose-100 rounded-2xl py-6 px-5 text-center">
              <p className="text-[12px] font-medium text-rose-700">{error}</p>
            </div>
          ) : (
            <>
              {reply && (
                <p className="text-[13px] font-medium text-black/65 leading-relaxed px-1">
                  {reply}
                </p>
              )}

              <div className="space-y-2">
                {days.map((day) => {
                  const assignment = assignments.find((a) => a.date === day.date)
                  const recipe = assignment?.recipeId
                    ? recipeById.get(assignment.recipeId)
                    : null

                  return (
                    <div
                      key={day.date}
                      className="relative rounded-2xl px-4 py-3.5 bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden"
                    >
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
                              {day.weekday.slice(0, 3)} · {day.theme}
                            </span>
                          </div>

                          {recipe ? (
                            <>
                              <p className="text-[14px] font-medium text-black leading-snug truncate">
                                {recipe.title}
                              </p>
                              <p className="text-[11px] font-medium text-black/45 mt-0.5">
                                {recipe.cookTime}m
                                {assignment?.reason && ` · ${assignment.reason}`}
                              </p>
                            </>
                          ) : (
                            <p className="text-[12px] font-medium text-black/40 italic">
                              {assignment?.reason || 'No suitable recipe.'}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSwapDate(swapDate === day.date ? null : day.date)}
                          className="text-[10px] font-semibold uppercase tracking-wider text-black/45 hover:text-black bg-white/60 backdrop-blur-sm border border-white/60 px-2.5 py-1 rounded-full transition-colors shrink-0"
                        >
                          {swapDate === day.date ? 'Cancel' : 'Swap'}
                        </button>
                      </div>

                      {/* Inline swap options */}
                      {swapDate === day.date && (
                        <div className="mt-3 pt-3 border-t border-white/40 space-y-1 relative z-10">
                          {swapOptions(day.date).length === 0 ? (
                            <p className="text-[11px] font-medium text-black/40 italic">
                              No other {day.theme.toLowerCase()} recipes to swap to.
                            </p>
                          ) : (
                            swapOptions(day.date).map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => handleSwap(day.date, r.id)}
                                className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                                  r.id === assignment?.recipeId
                                    ? 'bg-black/10 text-black'
                                    : 'hover:bg-white/60 text-black/70'
                                }`}
                              >
                                {r.title}
                                <span className="text-black/40">
                                  {' · '}
                                  {r.cookTime}m
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && assignments.length > 0 && (
          <div className="px-6 pt-3 pb-6 border-t border-white/40 space-y-2 relative z-10">
            <div className="text-[11px] font-medium text-black/40 px-1">
              {plannedCount} of 7 days can be planned
            </div>
            <button
              type="button"
              onClick={handleCommit}
              disabled={committing || plannedCount === 0}
              className="w-full bg-black text-white text-[14px] font-semibold py-3.5 rounded-full hover:bg-black/85 active:scale-[0.98] disabled:opacity-40 transition-all"
            >
              {committing ? 'Saving…' : `Use this plan (${plannedCount} days)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}