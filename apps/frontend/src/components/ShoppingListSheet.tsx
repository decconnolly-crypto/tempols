import { useState, useEffect, useMemo } from 'react'

interface ShoppingListItem {
  name: string
  quantity?: string
  unit?: string
  from: string[] // recipe titles
}

interface ShoppingListSheetProps {
  isOpen: boolean
  weekStart: string // 'YYYY-MM-DD'
  weekEnd: string
  onClose: () => void
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
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

export function ShoppingListSheet({
  isOpen,
  weekStart,
  weekEnd,
  onClose,
}: ShoppingListSheetProps) {
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    setChecked(new Set())
    setCopied(false)

    fetch(`/api/meals/shopping-list?start=${weekStart}&end=${weekEnd}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.shoppingList || [])
      })
      .catch((err) => {
        console.error('Shopping list error:', err)
        setItems([])
      })
      .finally(() => setLoading(false))
  }, [isOpen, weekStart, weekEnd])

  const totalItems = items.length

  const toggleChecked = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const copyToClipboard = () => {
    const text = items
      .map((item) => {
        const parts = [item.name]
        if (item.quantity) parts.push(item.quantity)
        if (item.unit) parts.push(item.unit)
        return `☐ ${parts.join(' ')}`
      })
      .join('\n')

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => console.error('Clipboard error:', err))
  }

  // Group by first letter for easier scanning when the list is long
  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingListItem[]>()
    const sorted = [...items].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
    for (const item of sorted) {
      const letter = item.name[0]?.toUpperCase() || '#'
      const existing = map.get(letter) || []
      existing.push(item)
      map.set(letter, existing)
    }
    return Array.from(map.entries())
  }, [items])

  if (!isOpen) return null

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
              Shopping list
            </p>
            <h2 className="text-[17px] font-medium text-black tracking-tight mt-0.5">
              {weekLabel(weekStart, weekEnd)}
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
        <div className="flex-1 overflow-y-auto px-6 py-5 relative z-10">
          {loading ? (
            <p className="text-[12px] text-black/40 text-center py-8">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <div className="bg-white/40 backdrop-blur-sm border border-dashed border-white/60 rounded-2xl py-8 px-5 text-center">
              <p className="text-[13px] font-medium text-black/55 mb-1">
                Nothing to shop for yet.
              </p>
              <p className="text-[11px] font-medium text-black/40">
                Plan some meals for the week and their ingredients will appear
                here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(([letter, groupItems]) => (
                <div key={letter}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-2 px-1">
                    {letter}
                  </p>
                  <div className="space-y-1">
                    {groupItems.map((item) => {
                      const key = item.name.toLowerCase()
                      const isChecked = checked.has(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleChecked(key)}
                          className="w-full text-left flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/50 transition-colors"
                        >
                          <span
                            className={`w-[18px] h-[18px] rounded-md border-[1.8px] flex items-center justify-center shrink-0 transition-colors ${
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
                            className={`text-[13px] font-medium flex-1 min-w-0 truncate ${
                              isChecked
                                ? 'text-black/35 line-through'
                                : 'text-black'
                            }`}
                          >
                            {item.name}
                            {item.quantity && (
                              <span className="text-black/50">
                                {' · '}
                                {item.quantity}
                                {item.unit ? ` ${item.unit}` : ''}
                              </span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 pt-3 pb-6 border-t border-white/40 space-y-2 relative z-10">
            <div className="flex items-center justify-between text-[11px] font-medium text-black/40 px-1">
              <span>
                {totalItems} item{totalItems === 1 ? '' : 's'}
              </span>
              {checked.size > 0 && (
                <span>
                  {checked.size} checked
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={copyToClipboard}
              className="w-full bg-black text-white text-[13px] font-semibold py-3.5 rounded-full hover:bg-black/85 active:scale-[0.98] transition-all"
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}