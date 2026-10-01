import { useState, useEffect, useMemo } from 'react'

interface OrganisedItem {
  name: string
  quantity?: string
  from: string[]
}

interface Section {
  aisle: string
  items: OrganisedItem[]
}

interface ManualItem {
  id: string
  name: string
  aisle: string
}

interface ShoppingListSheetProps {
  isOpen: boolean
  weekStart: string
  weekEnd: string
  onClose: () => void
}

const AISLES = [
  'Fruit & Veg',
  'Chilled',
  'Meat',
  'Bakery',
  'Dairy',
  'Cupboard',
  'Frozen',
  'Drinks',
  'NEG',
]

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
  const [sections, setSections] = useState<Section[]>([])
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [loading, setLoading] = useState(false)
  const [organising, setOrganising] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemAisle, setNewItemAisle] = useState(AISLES[0])
  const [savingItem, setSavingItem] = useState(false)

  // Merge AI items + manual items into sectioned output
  const mergedSections = useMemo(() => {
    const map = new Map<string, OrganisedItem[]>()

    for (const section of sections) {
      map.set(section.aisle, [...(map.get(section.aisle) || []), ...section.items])
    }

    for (const manual of manualItems) {
      const existing = map.get(manual.aisle) || []
      existing.push({
        name: manual.name,
        quantity: undefined,
        from: ['Added by you'],
      })
      map.set(manual.aisle, existing)
    }

    // Order by the AISLES list, and only include sections with items
    return AISLES
      .filter((aisle) => map.has(aisle) && (map.get(aisle) || []).length > 0)
      .map((aisle) => ({ aisle, items: map.get(aisle)! }))
  }, [sections, manualItems])

  const totalItems = useMemo(
    () => mergedSections.reduce((sum, s) => sum + s.items.length, 0),
    [mergedSections]
  )

  // Load (and auto-organise) when the sheet opens
  useEffect(() => {
    if (!isOpen) return

    setChecked(new Set())
    setCopied(false)
    setError(null)
    setIsAdding(false)
    setNewItemName('')

    setLoading(true)
    fetch(`/api/meals/shopping-list/organised?weekStart=${weekStart}`)
      .then((res) => res.json())
      .then((data) => {
        setSections(data.sections || [])
        setManualItems(data.manualItems || [])

        // If nothing has been organised yet, trigger it
        if (!data.cached && (data.sections || []).length === 0) {
          triggerOrganise(false)
        }
      })
      .catch((err) => {
        console.error('Shopping list load error:', err)
        setError('Could not load shopping list.')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, weekStart])

  const triggerOrganise = (force: boolean) => {
    setOrganising(true)
    setError(null)

    fetch('/api/meals/shopping-list/organise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart, force }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          return
        }
        setSections(data.sections || [])
        // Re-fetch manual items in case they changed
        return fetch(
          `/api/meals/shopping-list/organised?weekStart=${weekStart}`
        )
          .then((r) => r.json())
          .then((d) => setManualItems(d.manualItems || []))
      })
      .catch((err) => {
        console.error('Organise error:', err)
        setError('Could not organise the list.')
      })
      .finally(() => setOrganising(false))
  }

  const toggleChecked = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const copyToClipboard = () => {
    const lines: string[] = []
    for (const section of mergedSections) {
      lines.push(section.aisle.toUpperCase())
      for (const item of section.items) {
        const parts = [item.name]
        if (item.quantity) parts.push(item.quantity)
        lines.push(`☐ ${parts.join(' · ')}`)
      }
      lines.push('')
    }

    navigator.clipboard
      .writeText(lines.join('\n').trim())
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => console.error('Clipboard error:', err))
  }

  const handleAddItem = () => {
    if (!newItemName.trim() || savingItem) return

    setSavingItem(true)
    fetch('/api/meals/shopping-list/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart,
        name: newItemName.trim(),
        aisle: newItemAisle,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.item) {
          setManualItems((prev) => [...prev, data.item])
          setNewItemName('')
          setIsAdding(false)
        }
      })
      .catch((err) => console.error('Add item error:', err))
      .finally(() => setSavingItem(false))
  }

  const handleRemoveManualItem = (id: string) => {
    fetch(`/api/meals/shopping-list/manual/${id}`, { method: 'DELETE' })
      .then(() => {
        setManualItems((prev) => prev.filter((m) => m.id !== id))
      })
      .catch((err) => console.error('Remove item error:', err))
  }

  if (!isOpen) return null

  const showLoading = loading || organising

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-white/85 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
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

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsAdding((v) => !v)}
              aria-label="Add item"
              className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm border border-white/60 flex items-center justify-center text-black/50 hover:text-black active:scale-95 transition-all"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => triggerOrganise(true)}
              disabled={organising}
              aria-label="Regenerate"
              className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm border border-white/60 flex items-center justify-center text-black/50 hover:text-black active:scale-95 transition-all disabled:opacity-40"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm border border-white/60 flex items-center justify-center text-black/50 hover:text-black transition-colors"
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
        </div>

        {/* Add item form */}
        {isAdding && (
          <div className="px-6 pt-4 pb-3 border-b border-white/40 relative z-10 space-y-2 bg-white/40">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem()
              }}
              placeholder="Item name (e.g. Washing up liquid)"
              className="w-full bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-2.5 text-[13px] font-medium text-black placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-black/20"
              autoFocus
            />
            <div className="flex flex-wrap gap-1">
              {AISLES.map((aisle) => (
                <button
                  key={aisle}
                  type="button"
                  onClick={() => setNewItemAisle(aisle)}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                    newItemAisle === aisle
                      ? 'bg-black text-white'
                      : 'bg-white/60 border border-white/60 text-black/55 hover:text-black'
                  }`}
                >
                  {aisle}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false)
                  setNewItemName('')
                }}
                className="flex-1 text-black/50 text-[12px] font-medium py-2 rounded-full hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!newItemName.trim() || savingItem}
                className="flex-1 bg-black text-white text-[12px] font-semibold py-2 rounded-full disabled:opacity-40 hover:bg-black/85 transition-colors"
              >
                {savingItem ? 'Adding…' : 'Add to list'}
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 relative z-10">
          {showLoading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-black/50 text-[12px] font-medium">
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              {organising ? 'Organising by aisle…' : 'Loading…'}
            </div>
          ) : error ? (
            <div className="bg-rose-50 backdrop-blur-sm border border-rose-100 rounded-2xl py-5 px-5 text-center">
              <p className="text-[12px] font-medium text-rose-700">{error}</p>
              <button
                type="button"
                onClick={() => triggerOrganise(true)}
                className="text-[11px] font-semibold text-rose-700 underline mt-2"
              >
                Try again
              </button>
            </div>
          ) : mergedSections.length === 0 ? (
            <div className="bg-white/40 backdrop-blur-sm border border-dashed border-white/60 rounded-2xl py-8 px-5 text-center">
              <p className="text-[13px] font-medium text-black/55 mb-1">
                Nothing on the list yet.
              </p>
              <p className="text-[11px] font-medium text-black/40">
                Plan some meals for the week, or add an item manually.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {mergedSections.map((section) => (
                <div key={section.aisle}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-2 px-1">
                    {section.aisle}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item, i) => {
                      const key = `${section.aisle}::${item.name}::${i}`
                      const isChecked = checked.has(key)
                      const isManual = item.from[0] === 'Added by you'

                      return (
                        <div
                          key={key}
                          className="group flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/50 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => toggleChecked(key)}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
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
                            <span className="flex-1 min-w-0">
                              <span
                                className={`text-[13px] font-medium block truncate ${
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
                                  </span>
                                )}
                              </span>
                              {!isManual && item.from.length > 1 && (
                                <span className="text-[10px] font-medium text-black/35 block truncate mt-0.5">
                                  from {item.from.join(', ')}
                                </span>
                              )}
                            </span>
                          </button>

                          {isManual && (
                            <button
                              type="button"
                              onClick={() => {
                                const manual = manualItems.find(
                                  (m) =>
                                    m.name === item.name &&
                                    m.aisle === section.aisle
                                )
                                if (manual) handleRemoveManualItem(manual.id)
                              }}
                              aria-label="Remove item"
                              className="w-6 h-6 rounded-full flex items-center justify-center text-black/25 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            >
                              <svg
                                className="w-3 h-3"
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
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {mergedSections.length > 0 && !showLoading && (
          <div className="px-6 pt-3 pb-6 border-t border-white/40 space-y-2 relative z-10">
            <div className="flex items-center justify-between text-[11px] font-medium text-black/40 px-1">
              <span>
                {totalItems} item{totalItems === 1 ? '' : 's'}
              </span>
              {checked.size > 0 && <span>{checked.size} checked</span>}
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