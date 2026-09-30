import { useState, useEffect, useMemo } from 'react'
import type { Meal } from '../types'
import { themeForDate } from '../utils/mealThemes'

interface MealsViewProps {
  onOpenRecipePicker: (date: string) => void
  onOpenRecipeLibrary: () => void
  onOpenShoppingList: () => void
  onOpenAIPlanner: () => void
  refreshKey: number
  weekStart: string
  onWeekChange: (newStart: string) => void
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateStr(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function addDays(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr)
  d.setDate(d.getDate() + days)
  return formatDateStr(d)
}

function mondayOf(dateStr: string): string {
  const d = parseDateStr(dateStr)
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return formatDateStr(d)
}

function isToday(dateStr: string): boolean {
  return formatDateStr(new Date()) === dateStr
}

function dayLabel(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return d.toLocaleDateString('en-GB', { weekday: 'long' })
}

function shortDate(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function weekLabel(startStr: string, endStr: string): string {
  const s = parseDateStr(startStr)
  const e = parseDateStr(endStr)
  const sameMonth = s.getMonth() === e.getMonth()
  const sDay = s.getDate()
  const eDay = e.getDate()
  const month = s.toLocaleDateString('en-GB', { month: 'short' })
  const year = s.getFullYear()
  return sameMonth
    ? `${sDay} – ${eDay} ${month} ${year}`
    : `${sDay} ${s.toLocaleDateString('en-GB', {
        month: 'short',
      })} – ${eDay} ${e.toLocaleDateString('en-GB', {
        month: 'short',
      })} ${year}`
}

export function MealsView({
  onOpenRecipePicker,
  onOpenRecipeLibrary,
  onOpenShoppingList,
  onOpenAIPlanner,
  refreshKey,
  weekStart,
  onWeekChange,
}: MealsViewProps) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/meals?start=${weekStart}&end=${weekEnd}`)
      .then((res) => res.json())
      .then((data) => {
        setMeals(data.meals || [])
      })
      .catch((err) => {
        console.error('Meals fetch error:', err)
        setError('Could not load meals.')
      })
      .finally(() => setLoading(false))
  }, [weekStart, weekEnd, refreshKey])

  const mealByDate = useMemo(() => {
    const map = new Map<string, Meal>()
    for (const m of meals) map.set(m.date, m)
    return map
  }, [meals])

  const plannedCount = meals.filter((m) => m.recipe || m.notes).length

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-2">
        <div className="min-w-0">
          <h2 className="text-2xl font-medium text-black tracking-tight leading-tight">
            Meals
          </h2>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-black/40 mt-1">
            {weekLabel(weekStart, weekEnd)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenAIPlanner}
            className="h-9 px-3.5 bg-white/60 backdrop-blur-xl hover:bg-white/80 text-black rounded-full text-[11px] font-semibold border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <svg
              className="w-3 h-3 text-black/60"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L14.26 8.74L21 11L14.26 13.26L12 20L9.74 13.26L3 11L9.74 8.74L12 2Z" />
            </svg>
            <span>Plan</span>
          </button>

          <button
            type="button"
            onClick={onOpenRecipeLibrary}
            className="h-9 px-3 bg-white/60 backdrop-blur-xl hover:bg-white/80 text-black rounded-full text-[11px] font-semibold border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-1 active:scale-95 transition-all"
          >
            <svg
              className="w-3 h-3 text-black/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span>Recipes</span>
          </button>
        </div>
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={() => onWeekChange(addDays(weekStart, -7))}
          aria-label="Previous week"
          className="w-8 h-8 rounded-full bg-white/50 backdrop-blur-sm border border-white/60 flex items-center justify-center text-black/50 hover:text-black active:scale-95 transition-all"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => onWeekChange(mondayOf(formatDateStr(new Date())))}
          className="text-[11px] font-semibold uppercase tracking-wider text-black/45 hover:text-black transition-colors"
        >
          This week
        </button>

        <button
          type="button"
          onClick={() => onWeekChange(addDays(weekStart, 7))}
          aria-label="Next week"
          className="w-8 h-8 rounded-full bg-white/50 backdrop-blur-sm border border-white/60 flex items-center justify-center text-black/50 hover:text-black active:scale-95 transition-all"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days list */}
      {loading ? (
        <p className="text-[12px] text-black/40 text-center py-8">Loading…</p>
      ) : error ? (
        <p className="text-[12px] text-rose-600 text-center py-8">{error}</p>
      ) : (
        <div className="space-y-2">
          {days.map((day) => {
            const theme = themeForDate(day)
            const meal = mealByDate.get(day)
            const today = isToday(day)

            return (
              <button
                key={day}
                type="button"
                onClick={() => onOpenRecipePicker(day)}
                className={`relative w-full text-left rounded-2xl px-4 py-3.5 flex items-start gap-3 overflow-hidden transition-all active:scale-[0.99] bg-white/55 backdrop-blur-2xl border shadow-[0_2px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.03)] ${
                  today ? 'border-white/80' : 'border-white/60 hover:bg-white/70'
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

                <div className="w-14 shrink-0 pt-0.5 relative z-10">
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      today ? 'text-black' : 'text-black/45'
                    }`}
                  >
                    {dayLabel(day).slice(0, 3)}
                  </div>
                  <div
                    className={`text-[13px] font-semibold mt-0.5 ${
                      today ? 'text-black' : 'text-black/60'
                    }`}
                  >
                    {shortDate(day).split(' ')[0]}
                  </div>
                </div>

                <div className="min-w-0 flex-1 relative z-10">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
                      {theme.label}
                    </span>
                    {today && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white bg-black px-2 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                  </div>

                  {meal?.recipe ? (
                    <>
                      <p className="text-[14px] font-medium text-black leading-snug truncate">
                        {meal.recipe.title}
                      </p>
                      <p className="text-[11px] font-medium text-black/40 mt-0.5">
                        {meal.recipe.cookTime}m
                        {meal.recipe.tags.length > 0 &&
                          ` · ${meal.recipe.tags.slice(0, 2).join(' · ')}`}
                      </p>
                    </>
                  ) : meal?.notes ? (
                    <p className="text-[13px] font-medium text-black/55 italic">
                      {meal.notes}
                    </p>
                  ) : (
                    <p className="text-[12px] font-medium text-black/35">
                      Tap to plan
                    </p>
                  )}
                </div>

                <svg
                  className="w-3.5 h-3.5 text-black/25 mt-1.5 shrink-0 relative z-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )
          })}
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenShoppingList}
          className="flex-1 bg-white/60 backdrop-blur-xl hover:bg-white/80 text-black rounded-full py-3 text-[12px] font-semibold border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all"
        >
          Shopping list
        </button>
        <div className="text-[11px] font-medium text-black/40 px-2">
          {plannedCount} of 7 planned
        </div>
      </div>
    </div>
  )
}