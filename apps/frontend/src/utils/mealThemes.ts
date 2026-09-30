import type { MealCategory } from '../types'

/**
 * The weekly theme structure. Each day of the week has a category.
 * Day index matches JavaScript's Date.getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */
export const WEEKLY_THEMES: Record<number, { code: MealCategory; label: string }> = {
  0: { code: 'SUNDAY', label: 'Sunday Lunch' },
  1: { code: 'EASY', label: 'Easy Dinner' },
  2: { code: 'PASTA', label: 'Pasta Night' },
  3: { code: 'WINTER', label: 'Winter Warmers' },
  4: { code: 'WORLD', label: 'World Foods' },
  5: { code: 'FUN', label: 'Fun Food' },
  6: { code: 'FAKEAWAY', label: 'Fakeaway' },
}

export const CATEGORIES: Array<{ code: MealCategory; label: string }> = [
  { code: 'EASY', label: 'Easy Dinner' },
  { code: 'PASTA', label: 'Pasta Night' },
  { code: 'WINTER', label: 'Winter Warmers' },
  { code: 'WORLD', label: 'World Foods' },
  { code: 'FUN', label: 'Fun Food' },
  { code: 'FAKEAWAY', label: 'Fakeaway' },
  { code: 'SUNDAY', label: 'Sunday Lunch' },
  { code: 'ANY', label: 'Any Night' },
]

/**
 * Given a date string (YYYY-MM-DD), return the theme for that day.
 */
export function themeForDate(dateStr: string): { code: MealCategory; label: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return WEEKLY_THEMES[date.getDay()]
}

/**
 * Given a category code, return the human label.
 */
export function categoryLabel(code: MealCategory): string {
  const found = CATEGORIES.find((c) => c.code === code)
  return found ? found.label : code
}