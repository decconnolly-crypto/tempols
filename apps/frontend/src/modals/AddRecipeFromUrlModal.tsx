import { useState } from 'react'
import type { MealCategory, RecipeInstruction } from '../types'
import { CATEGORIES } from '../utils/mealThemes'

interface FetchedRecipe {
  title: string
  ingredients: string[]
  instructions: RecipeInstruction[]
  cookTime: number
  tags: string[]
  sourceUrl: string
  sourceName: string
}

interface AddRecipeFromUrlModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    title: string
    category: MealCategory
    cookTime: number
    ingredients: string[]
    instructions: RecipeInstruction[]
    tags: string[]
    sourceUrl?: string
    sourceName?: string
  }) => Promise<unknown>
}

export function AddRecipeFromUrlModal({
  isOpen,
  onClose,
  onSave,
}: AddRecipeFromUrlModalProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState<FetchedRecipe | null>(null)
  const [category, setCategory] = useState<MealCategory>('ANY')

  if (!isOpen) return null

  const reset = () => {
    setUrl('')
    setLoading(false)
    setSaving(false)
    setError(null)
    setFetched(null)
    setCategory('ANY')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFetch = async () => {
    if (!url.trim() || loading) return

    setLoading(true)
    setError(null)
    setFetched(null)

    try {
      const res = await fetch('/api/recipes/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      const r = data.recipe
      if (!r) {
        setError('No recipe was found at that URL.')
        return
      }

      setFetched({
        title: r.title,
        ingredients: r.ingredients || [],
        instructions: r.instructions || [],
        cookTime: r.cookTime || 30,
        tags: r.tags || [],
        sourceUrl: r.sourceUrl,
        sourceName: r.sourceName,
      })
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Could not reach that URL. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!fetched || saving) return

    setSaving(true)
    setError(null)

    try {
      await onSave({
        title: fetched.title,
        category,
        cookTime: fetched.cookTime,
        ingredients: fetched.ingredients,
        instructions: fetched.instructions,
        tags: fetched.tags,
        sourceUrl: fetched.sourceUrl,
        sourceName: fetched.sourceName,
      })
      reset()
    } catch (err) {
      console.error('Save error:', err)
      setError('Could not save the recipe. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={handleClose}
      />

      <div className="relative bg-white/85 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start px-6 pt-6 pb-4 border-b border-white/40 relative z-10">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-black/45 mb-0.5">
              Add recipe
            </p>
            <h2 className="text-[17px] font-medium text-black tracking-tight">
              From a link
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
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
        <div className="flex-1 overflow-y-auto px-6 py-5 relative z-10 space-y-5">
          {/* URL input */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-black/45 block mb-1.5 px-1">
              Recipe URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url.trim() && !fetched) {
                    e.preventDefault()
                    handleFetch()
                  }
                }}
                placeholder="https://..."
                className="flex-1 min-w-0 bg-white/60 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-3 text-[13px] font-medium text-black placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-black/20"
                disabled={loading || Boolean(fetched)}
                autoFocus
              />
              {!fetched && (
                <button
                  type="button"
                  onClick={handleFetch}
                  disabled={loading || !url.trim()}
                  className="px-4 py-3 bg-black text-white rounded-2xl text-[12px] font-semibold disabled:opacity-30 hover:bg-black/85 active:scale-95 transition-all shrink-0"
                >
                  {loading ? '…' : 'Fetch'}
                </button>
              )}
            </div>
            {!fetched && !loading && (
              <p className="text-[10px] font-medium text-black/40 mt-2 px-1">
                Works with most recipe websites. For Instagram, paste the caption text instead.
              </p>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-8 text-black/50 text-[12px] font-medium">
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Reading the page…
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-rose-50 backdrop-blur-sm border border-rose-100 rounded-2xl py-4 px-4">
              <p className="text-[12px] font-medium text-rose-700">{error}</p>
            </div>
          )}

          {/* Fetched preview */}
          {fetched && (
            <>
              {/* Preview card */}
              <div className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-2xl px-4 py-3.5">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                    Found
                  </span>
                  <span className="text-[10px] font-medium text-black/40 mt-0.5 truncate">
                    {fetched.sourceName}
                  </span>
                </div>
                <p className="text-[14px] font-medium text-black leading-snug mt-2">
                  {fetched.title}
                </p>
                <p className="text-[11px] font-medium text-black/45 mt-1">
                  {fetched.cookTime}m ·{' '}
                  {fetched.ingredients.length} ingredient
                  {fetched.ingredients.length === 1 ? '' : 's'} ·{' '}
                  {fetched.instructions.length} step
                  {fetched.instructions.length === 1 ? '' : 's'}
                </p>
              </div>

              {/* Category picker */}
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

              {/* Tags preview */}
              {fetched.tags.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-black/45 block mb-2 px-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {fetched.tags.slice(0, 10).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium text-black/55 bg-white/60 backdrop-blur-sm border border-white/50 px-2.5 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset link */}
              <button
                type="button"
                onClick={() => {
                  setFetched(null)
                  setError(null)
                }}
                className="text-[11px] font-medium text-black/45 hover:text-black transition-colors px-1"
              >
                ← Use a different URL
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        {fetched && (
          <div className="px-6 pt-3 pb-6 border-t border-white/40 relative z-10">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-black text-white text-[13px] font-semibold py-3.5 rounded-full hover:bg-black/85 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {saving ? 'Saving…' : 'Add to library'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}