import { useState, useEffect } from 'react'
import type { Meal, Recipe } from '../types'
import { themeForDate } from '../utils/mealThemes'

interface RecipePickerModalProps {
  isOpen: boolean
  date: string | null
  recipes: Recipe[]
  onClose: () => void
  onAssignRecipe: (date: string, recipeId: string) => void
  onSetNote: (date: string, notes: string) => void
  onClearDay: (date: string) => void
  onOpenLibrary: () => void
}

function formatDateHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function RecipePickerModal({
  isOpen,
  date,
  recipes,
  onClose,
  onAssignRecipe,
  onSetNote,
  onClearDay,
  onOpenLibrary,
}: RecipePickerModalProps) {
  const [noteText, setNoteText] = useState('')
  const [currentMeal, setCurrentMeal] = useState<Meal | null>(null)

  // Fetch the current meal for the selected date whenever the modal opens
  useEffect(() => {
    if (!isOpen || !date) {
      setCurrentMeal(null)
      return
    }

    fetch(`/api/meals?start=${date}&end=${date}`)
      .then((res) => res.json())
      .then((data) => {
        setCurrentMeal(data.meals?.[0] || null)
      })
      .catch((err) => console.error('Error fetching meal for picker:', err))
  }, [isOpen, date])

  // Pre-populate the note field if the current meal has a note
  useEffect(() => {
    if (isOpen && currentMeal?.notes) {
      setNoteText(currentMeal.notes)
    } else {
      setNoteText('')
    }
  }, [isOpen, currentMeal])

  if (!isOpen || !date) return null

  const theme = themeForDate(date)

  // Filter recipes to this day's category, plus 'ANY'
  const matchingRecipes = recipes.filter(
    (r) => r.category === theme.code || r.category === 'ANY'
  )

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-white/80 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start px-6 pt-6 pb-4 border-b border-white/40 relative z-10">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-black/45">
              {theme.label}
            </p>
            <h2 className="text-[17px] font-medium text-black tracking-tight mt-0.5">
              {formatDateHeader(date)}
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 relative z-10">
          {/* Current meal indicator */}
          {currentMeal?.recipe && (
            <div className="bg-black/5 backdrop-blur-sm border border-white/40 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">
                Currently planned
              </p>
              <p className="text-[13px] font-medium text-black">
                {currentMeal.recipe.title}
              </p>
            </div>
          )}

          {currentMeal?.notes && !currentMeal.recipe && (
            <div className="bg-black/5 backdrop-blur-sm border border-white/40 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">
                Currently noted
              </p>
              <p className="text-[13px] font-medium text-black italic">
                {currentMeal.notes}
              </p>
            </div>
          )}

          {/* Recipe options */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-black/45">
                {theme.label} recipes
              </p>
              <button
                type="button"
                onClick={onOpenLibrary}
                className="text-[10px] font-semibold uppercase tracking-wider text-black/50 hover:text-black transition-colors"
              >
                Manage
              </button>
            </div>

            {matchingRecipes.length === 0 ? (
              <button
                type="button"
                onClick={onOpenLibrary}
                className="w-full bg-white/40 backdrop-blur-sm border border-dashed border-white/60 rounded-2xl py-6 px-5 text-center hover:bg-white/60 transition-colors"
              >
                <p className="text-[12px] font-medium text-black/55 mb-1">
                  No {theme.label.toLowerCase()} recipes yet.
                </p>
                <p className="text-[11px] font-medium text-black/40">
                  Tap to add one to your library.
                </p>
              </button>
            ) : (
              <div className="space-y-2">
                {matchingRecipes.map((r) => {
                  const isCurrent = currentMeal?.recipe?.id === r.id
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        onAssignRecipe(date, r.id)
                        onClose()
                      }}
                      className={`relative w-full text-left rounded-2xl px-4 py-3.5 backdrop-blur-2xl border shadow-[0_2px_12px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-all overflow-hidden ${
                        isCurrent
                          ? 'bg-black/10 border-black/20'
                          : 'bg-white/55 border-white/60 hover:bg-white/70'
                      }`}
                    >
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-black leading-snug truncate">
                            {r.title}
                          </p>
                          <p className="text-[11px] font-medium text-black/40 mt-0.5">
                            {r.cookTime}m
                            {r.ingredients.length > 0 &&
                              ` · ${r.ingredients.length} ingredient${
                                r.ingredients.length === 1 ? '' : 's'
                              }`}
                            {r.category === 'ANY' && ' · Any night'}
                          </p>
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-white bg-black px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                            Current
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Note option */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-black/45 mb-2 px-1">
              Or add a note
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Eating out, leftovers, takeaway…"
                className="flex-1 bg-white/60 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-3 text-[13px] font-medium text-black placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-black/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && noteText.trim()) {
                    onSetNote(date, noteText.trim())
                    onClose()
                  }
                }}
              />
              <button
                type="button"
                disabled={!noteText.trim()}
                onClick={() => {
                  onSetNote(date, noteText.trim())
                  onClose()
                }}
                className="px-4 py-3 bg-black text-white rounded-2xl text-[12px] font-semibold disabled:opacity-30 hover:bg-black/85 active:scale-95 transition-all shrink-0"
              >
                Set
              </button>
            </div>
          </div>
        </div>

        {/* Footer — Clear option, only if something is currently set */}
        {(currentMeal?.recipe || currentMeal?.notes) && (
          <div className="px-6 pt-3 pb-6 border-t border-white/40 relative z-10">
            <button
              type="button"
              onClick={() => {
                onClearDay(date)
                onClose()
              }}
              className="w-full text-rose-500 text-[12px] font-medium py-2 hover:text-rose-600 transition-colors"
            >
              Clear this day
            </button>
          </div>
        )}
      </div>
    </div>
  )
}