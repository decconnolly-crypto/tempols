import { useState, useEffect } from 'react'
import type { Horizon } from '../types'

interface NewMilestoneModalProps {
  isOpen: boolean
  horizon: Horizon | null
  onClose: () => void
  onSave: (data: {
    horizonId: string
    title: string
    description?: string
    targetDate: string
  }) => void
}

export function NewMilestoneModal({
  isOpen,
  horizon,
  onClose,
  onSave,
}: NewMilestoneModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const base = horizon?.startDate ? new Date(horizon.startDate) : new Date()
    base.setDate(base.getDate() + 7)
    setTargetDate(base.toISOString().slice(0, 10))

    setTitle('')
    setDescription('')
    setError(null)
  }, [isOpen, horizon])

  if (!isOpen || !horizon) return null

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!targetDate) {
      setError('Target date is required.')
      return
    }

    onSave({
      horizonId: horizon.id,
      title: title.trim(),
      description: description.trim() || undefined,
      targetDate,
    })

    setTitle('')
    setDescription('')
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-[2.5rem] p-7 w-full max-w-md shadow-2xl relative z-10 animate-in slide-in-from-bottom-10 fade-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="text-xl font-medium text-black tracking-tight">
              New Milestone
            </h2>
            <p className="text-[11px] font-medium text-black/40 mt-0.5 truncate">
              {horizon.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-black/50 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Milestone (e.g. Design system done)"
          className="w-full bg-gray-50 p-4 rounded-2xl text-black font-medium text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-black/10"
          autoFocus
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does 'done' look like? (optional)"
          rows={2}
          className="w-full bg-gray-50 p-4 rounded-2xl text-black font-medium text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-black/10 resize-none"
        />

        <div className="mb-5">
          <label className="text-[11px] font-medium text-black/40 uppercase tracking-wider block mb-2 px-1">
            Target Date
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full bg-gray-50 px-4 py-3 rounded-2xl text-sm font-medium text-black focus:outline-none border border-transparent focus:border-black/10"
          />
          {horizon.startDate && (
            <p className="text-[10px] font-medium text-black/30 mt-2 px-1">
              Horizon runs{' '}
              {new Date(horizon.startDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
              {horizon.targetDate &&
                ` → ${new Date(horizon.targetDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}`}
            </p>
          )}
        </div>

        {error && (
          <p className="text-[12px] font-medium text-rose-600 mb-3 text-center">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="w-full bg-black text-white text-[15px] font-medium py-4 rounded-full shadow-lg hover:bg-black/90 transition-colors"
        >
          Save Milestone
        </button>
      </div>
    </div>
  )
}