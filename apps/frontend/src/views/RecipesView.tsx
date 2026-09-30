import { useState, useMemo } from 'react'
import { useLocation } from 'wouter'
import type { Recipe, MealCategory } from '../types'
import { CATEGORIES, categoryLabel } from '../utils/mealThemes'

interface RecipesViewProps {
    recipes: Recipe[]
    loading: boolean
    onNewRecipe: () => void
    onViewRecipe: (recipe: Recipe) => void
    onAddFromUrl: () => void
  }

  export function RecipesView({
    recipes,
    loading,
    onNewRecipe,
    onViewRecipe,
    onAddFromUrl,
  }: RecipesViewProps) {
  const [, setLocation] = useLocation()
  const [filter, setFilter] = useState<MealCategory | 'ALL'>('ALL')

  const filtered = useMemo(() => {
    if (filter === 'ALL') return recipes
    return recipes.filter((r) => r.category === filter)
  }, [recipes, filter])

  const byCategory = useMemo(() => {
    const map = new Map<MealCategory, Recipe[]>()
    for (const r of filtered) {
      const existing = map.get(r.category) || []
      existing.push(r)
      map.set(r.category, existing)
    }
    return map
  }, [filtered])

  const orderedCategories = CATEGORIES.map((c) => c.code).filter(
    (code) => byCategory.has(code) && byCategory.get(code)!.length > 0
  )

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocation('/meals')}
            aria-label="Back to meals"
            className="w-8 h-8 rounded-full bg-white/50 backdrop-blur-sm border border-white/60 flex items-center justify-center text-black/50 hover:text-black active:scale-95 transition-all shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="min-w-0">
            <h2 className="text-2xl font-medium text-black tracking-tight leading-tight">
              Recipes
            </h2>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-black/40 mt-1">
              {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onAddFromUrl}
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
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span>Link</span>
          </button>

          <button
            type="button"
            onClick={onNewRecipe}
            className="h-9 px-3.5 bg-white/60 backdrop-blur-xl hover:bg-white/80 text-black rounded-full text-[11px] font-semibold border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <svg
              className="w-3 h-3 text-black/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${
            filter === 'ALL'
              ? 'bg-black text-white'
              : 'bg-white/60 backdrop-blur-sm border border-white/60 text-black/60 hover:text-black'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.code}
            type="button"
            onClick={() => setFilter(cat.code)}
            className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${
              filter === cat.code
                ? 'bg-black text-white'
                : 'bg-white/60 backdrop-blur-sm border border-white/60 text-black/60 hover:text-black'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-[12px] text-black/40 text-center py-8">Loading…</p>
      ) : recipes.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-xl border border-dashed border-white/60 rounded-[1.75rem] py-10 px-5 text-center">
          <p className="text-[13px] font-medium text-black/55 mb-1">
            No recipes yet.
          </p>
          <p className="text-[11px] font-medium text-black/40">
            Tap "New" to write one, or "Link" to pull one from a URL.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-xl border border-dashed border-white/60 rounded-[1.75rem] py-10 px-5 text-center">
          <p className="text-[13px] font-medium text-black/55">
            No recipes in{' '}
            {filter === 'ALL'
              ? 'this category'
              : categoryLabel(filter as MealCategory)}{' '}
            yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orderedCategories.map((code) => {
            const catRecipes = byCategory.get(code) || []
            if (catRecipes.length === 0) return null

            return (
              <div key={code}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-2 px-1">
                  {categoryLabel(code)}
                </p>
                <div className="space-y-2">
                  {catRecipes.map((r) => (
                    <div
                      key={r.id}
                      className="relative w-full rounded-2xl bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden transition-all hover:bg-white/70"
                    >
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

                      <button
                        type="button"
                        onClick={() => onViewRecipe(r)}
                        className="w-full text-left px-4 py-3.5 active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-start justify-between gap-3 relative z-10">
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium text-black leading-snug truncate">
                              {r.title}
                            </p>
                            <p className="text-[11px] font-medium text-black/40 mt-0.5 truncate">
                              {r.cookTime}m
                              {r.ingredients.length > 0 &&
                                ` · ${r.ingredients.length} ingredient${
                                  r.ingredients.length === 1 ? '' : 's'
                                }`}
                              {r.sourceName && ` · ${r.sourceName}`}
                            </p>
                          </div>
                          <svg
                            className="w-3.5 h-3.5 text-black/25 mt-1 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}