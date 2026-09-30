import { useState, useEffect } from 'react'
import type { Ingredient, MealCategory, Recipe, RecipeInstruction } from '../types'
import { CATEGORIES } from '../utils/mealThemes'

interface RecipeFormModalProps {
  isOpen: boolean
  recipe: Recipe | null
  onClose: () => void
  onSave: (data: {
    title: string
    category: MealCategory
    cookTime: number
    ingredients: Ingredient[]
    instructions: RecipeInstruction[]
    tags: string[]
    notes?: string
  }) => void
  onDelete?: (id: string) => void
}

type IngredientRow = {
  name: string
  quantity: string
  unit: string
}

const EMPTY_ROW: IngredientRow = { name: '', quantity: '', unit: '' }

/**
 * Instructions are edited as lines in a textarea.
 * Each line is either:
 *   - `## Title` → a step with a title only (rare, but supported)
 *   - `## Title | Step body...` → a titled step
 *   - `Just the step body...` → an untitled step
 */
function instructionsToText(instructions: RecipeInstruction[]): string {
  return instructions
    .map((step) => {
      if (step.title) {
        return `## ${step.title} | ${step.text}`
      }
      return step.text
    })
    .join('\n')
}

function textToInstructions(text: string): RecipeInstruction[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  return lines.map((line) => {
    const match = /^##\s*([^|]+?)\s*\|\s*(.+)$/.exec(line)
    if (match) {
      return { title: match[1].trim(), text: match[2].trim() }
    }
    return { text: line }
  })
}

export function RecipeFormModal({
  isOpen,
  recipe,
  onClose,
  onSave,
  onDelete,
}: RecipeFormModalProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<MealCategory>('EASY')
  const [cookTime, setCookTime] = useState('30')
  const [ingredients, setIngredients] = useState<IngredientRow[]>([EMPTY_ROW])
  const [instructionsText, setInstructionsText] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    if (recipe) {
      setTitle(recipe.title)
      setCategory(recipe.category)
      setCookTime(String(recipe.cookTime))

      // Convert ingredients to editable rows.
      // Fetched recipes have string ingredients; manual ones have objects.
      const rows: IngredientRow[] = recipe.ingredients.map((ing) => {
        if (typeof ing === 'string') {
          return { name: ing, quantity: '', unit: '' }
        }
        return {
          name: ing.name,
          quantity: ing.quantity || '',
          unit: ing.unit || '',
        }
      })
      setIngredients(rows.length > 0 ? rows : [EMPTY_ROW])

      setInstructionsText(instructionsToText(recipe.instructions || []))
      setTagsText(recipe.tags.join(', '))
      setNotes(recipe.notes || '')
    } else {
      setTitle('')
      setCategory('EASY')
      setCookTime('30')
      setIngredients([EMPTY_ROW])
      setInstructionsText('')
      setTagsText('')
      setNotes('')
    }
    setError(null)
  }, [isOpen, recipe])

  if (!isOpen) return null

  const updateIngredient = (
    index: number,
    field: keyof IngredientRow,
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  const addIngredientRow = () => {
    setIngredients((prev) => [...prev, EMPTY_ROW])
  }

  const removeIngredientRow = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required.')
      return
    }

    const cleanIngredients: Ingredient[] = ingredients
      .filter((row) => row.name.trim())
      .map((row) => ({
        name: row.name.trim(),
        quantity: row.quantity.trim() || undefined,
        unit: row.unit.trim() || undefined,
      }))

    const parsedTags = tagsText
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    const parsedCookTime = parseInt(cookTime, 10)

    onSave({
      title: title.trim(),
      category,
      cookTime:
        Number.isFinite(parsedCookTime) && parsedCookTime > 0
          ? parsedCookTime
          : 30,
      ingredients: cleanIngredients,
      instructions: textToInstructions(instructionsText),
      tags: parsedTags,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-white/80 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-white/40 relative z-10">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="text-[17px] font-medium text-black tracking-tight">
              {recipe ? 'Edit recipe' : 'New recipe'}
            </h2>
            {recipe?.sourceName && (
              <a
                href={recipe.sourceUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-black/45 hover:text-black transition-colors mt-0.5 inline-flex items-center gap-1 truncate"
              >
                from {recipe.sourceName}
                <svg
                  className="w-2.5 h-2.5 shrink-0"
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 relative z-10">
          {/* Title */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-black/45 block mb-1.5 px-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Spaghetti Bolognese"
              className="w-full bg-white/60 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-3 text-[14px] font-medium text-black placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-black/20"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-black/45 block mb-2 px-1">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.code}
                  type="button"
                  onClick={() => setCategory(cat.code)}
                  className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${
                    category === cat.code
                      ? 'bg-black text-white'
                      : 'bg-white/60 backdrop-blur-sm border border-white/60 text-black/60 hover:text-black'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cook time */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-black/45 block mb-1.5 px-1">
              Cook time (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              className="w-full bg-white/60 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-3 text-[14px] font-medium text-black focus:outline-none focus:ring-1 focus:ring-black/20"
            />
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-black/45">
                Ingredients
              </label>
              <button
                type="button"
                onClick={addIngredientRow}
                className="text-[11px] font-semibold text-black bg-white/60 backdrop-blur-sm border border-white/60 px-2.5 py-1 rounded-full hover:bg-white/80 transition-colors"
              >
                + Add
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((row, i) => (
                <div key={i} className="flex gap-1.5 items-stretch">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                    placeholder={
                      recipe && typeof recipe.ingredients[i] === 'string'
                        ? recipe.ingredients[i] as string
                        : 'Spaghetti'
                    }
                    className="flex-1 min-w-0 bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl px-3 py-2.5 text-[13px] font-medium text-black placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-black/20"
                  />
                  <input
                    type="text"
                    value={row.quantity}
                    onChange={(e) =>
                      updateIngredient(i, 'quantity', e.target.value)
                    }
                    placeholder="500"
                    className="w-16 bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-black placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-black/20 text-center"
                  />
                  <input
                    type="text"
                    value={row.unit}
                    onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                    placeholder="g"
                    className="w-14 bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-black placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-black/20 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(i)}
                    disabled={ingredients.length === 1}
                    className="w-9 shrink-0 flex items-center justify-center text-black/30 hover:text-rose-500 disabled:opacity-20 transition-colors"
                    aria-label="Remove ingredient"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-medium text-black/35 mt-2 px-1">
              Fetched recipes are stored as a single line per ingredient —
              edit them as you like.
            </p>
          </div>

          {/* Instructions */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-black/45 block mb-1.5 px-1">
              Method (one step per line)
            </label>
            <textarea
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              rows={8}
              placeholder={
                'Heat the oil in a large pan...\nAdd the onion and cook for 5 mins...\n## Simmer the sauce | Reduce heat and cook until thick.'
              }
              className="w-full bg-white/60 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-3 text-[13px] font-medium text-black placeholder:text-black/25 focus:outline-none focus:ring-1 focus:ring-black/20 resize-none leading-relaxed"
            />
            <p className="text-[10px] font-medium text-black/35 mt-2 px-1">
              Optional: start a line with{' '}
              <code className="text-black/55">## Title |</code> to give the
              step a heading.
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-black/45 block mb-1.5 px-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="kid-friendly, quick, vegetarian"
              className="w-full bg-white/60 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-3 text-[13px] font-medium text-black placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-black/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-black/45 block mb-1.5 px-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Freezes well, kids love it, etc."
              className="w-full bg-white/60 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-3 text-[13px] font-medium text-black placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-black/20 resize-none"
            />
          </div>

          {error && (
            <p className="text-[12px] font-medium text-rose-600 text-center">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pt-3 pb-6 border-t border-white/40 space-y-2 relative z-10">
          <button
            type="button"
            onClick={handleSave}
            className="w-full bg-black text-white text-[14px] font-semibold py-3.5 rounded-full hover:bg-black/85 active:scale-[0.98] transition-all"
          >
            {recipe ? 'Save changes' : 'Add recipe'}
          </button>

          {recipe && onDelete && (
            <button
              type="button"
              onClick={() => {
                const ok = window.confirm(
                  `Delete "${recipe.title}"? Meals already planned with it will lose the link.`
                )
                if (ok) {
                  onDelete(recipe.id)
                  onClose()
                }
              }}
              className="w-full text-rose-500 text-[12px] font-medium py-2 hover:text-rose-600 transition-colors"
            >
              Delete recipe
            </button>
          )}
        </div>
      </div>
    </div>
  )
}