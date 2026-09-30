import { useState, useEffect } from 'react'
import type { Recipe, RecipeIngredient } from '../types'
import { categoryLabel } from '../utils/mealThemes'

interface RecipeDetailSheetProps {
  recipe: Recipe | null
  onClose: () => void
  onEdit: (recipe: Recipe) => void
}

function ingredientToText(ing: RecipeIngredient): string {
  if (typeof ing === 'string') return ing
  const parts: string[] = []
  if (ing.quantity) parts.push(ing.quantity)
  if (ing.unit) parts.push(ing.unit)
  parts.push(ing.name)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function RecipeDetailSheet({
  recipe,
  onClose,
  onEdit,
}: RecipeDetailSheetProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set()
  )
  const [activeStep, setActiveStep] = useState<number | null>(null)

  // Reset ticks whenever a new recipe opens
  useEffect(() => {
    setCheckedIngredients(new Set())
    setActiveStep(null)
  }, [recipe?.id])

  if (!recipe) return null

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-white/85 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start px-6 pt-6 pb-4 border-b border-white/40 relative z-10">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-black/45 mb-1">
              {categoryLabel(recipe.category)} · {recipe.cookTime}m
            </p>
            <h2 className="text-[19px] font-medium text-black tracking-tight leading-snug">
              {recipe.title}
            </h2>

            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-black/50 hover:text-black transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate max-w-[200px]">
                  {recipe.sourceName || 'Source'}
                </span>
                <svg
                  className="w-3 h-3 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 relative z-10 space-y-6">
          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium text-black/55 bg-white/60 backdrop-blur-sm border border-white/50 px-2.5 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/45">
                Ingredients
              </p>
              {checkedIngredients.size > 0 && (
                <button
                  type="button"
                  onClick={() => setCheckedIngredients(new Set())}
                  className="text-[10px] font-semibold uppercase tracking-wider text-black/40 hover:text-black transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            {recipe.ingredients.length === 0 ? (
              <p className="text-[12px] font-medium text-black/40 italic px-1">
                No ingredients listed.
              </p>
            ) : (
              <div className="space-y-0.5">
                {recipe.ingredients.map((ing, i) => {
                  const isChecked = checkedIngredients.has(i)
                  const text = ingredientToText(ing)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleIngredient(i)}
                      className="w-full text-left flex items-start gap-3 py-2 px-2 rounded-xl hover:bg-white/50 transition-colors"
                    >
                      <span
                        className={`mt-0.5 w-[16px] h-[16px] rounded-md border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-black border-black'
                            : 'border-black/40'
                        }`}
                      >
                        {isChecked && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`text-[13px] font-medium flex-1 leading-snug ${
                          isChecked
                            ? 'text-black/35 line-through'
                            : 'text-black'
                        }`}
                      >
                        {text}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Instructions */}
          {recipe.instructions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/45 mb-3 px-1">
                Method
              </p>
              <div className="space-y-3">
                {recipe.instructions.map((step, i) => {
                  const isActive = activeStep === i
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveStep(isActive ? null : i)}
                      className={`w-full text-left rounded-2xl px-4 py-3.5 transition-colors ${
                        isActive
                          ? 'bg-white/80 border border-white/70'
                          : 'bg-white/40 border border-white/40 hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`text-[11px] font-bold tabular-nums shrink-0 mt-0.5 ${
                            isActive ? 'text-black' : 'text-black/45'
                          }`}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          {step.title && (
                            <p className="text-[13px] font-semibold text-black mb-1 leading-snug">
                              {step.title}
                            </p>
                          )}
                          <p className="text-[13px] font-medium text-black/75 leading-relaxed">
                            {step.text}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {recipe.notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/45 mb-3 px-1">
                Notes
              </p>
              <div className="bg-white/40 border border-white/40 rounded-2xl px-4 py-3">
                <p className="text-[12px] font-medium text-black/70 leading-relaxed whitespace-pre-wrap">
                  {recipe.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pt-3 pb-6 border-t border-white/40 relative z-10">
          <button
            type="button"
            onClick={() => {
              onEdit(recipe)
              onClose()
            }}
            className="w-full bg-black text-white text-[13px] font-semibold py-3.5 rounded-full hover:bg-black/85 active:scale-[0.98] transition-all"
          >
            Edit recipe
          </button>
        </div>
      </div>
    </div>
  )
}