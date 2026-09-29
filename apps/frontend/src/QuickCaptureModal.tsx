import { useState, useEffect, useRef } from 'react'
import type { AppTask, Horizon } from './types'

type TaskPhase = AppTask['phase']

export interface QuickCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  horizons: Horizon[]
  currentDateStr: string
  onSave: (
    title: string,
    tags: string[],
    phase: TaskPhase,
    durationMinutes: number,
    scheduledDate: string,
    horizonId?: string,
    description?: string
  ) => void
}

export function QuickCaptureModal({
  isOpen,
  onClose,
  horizons = [],
  currentDateStr,
  onSave,
}: QuickCaptureModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedPhase, setSelectedPhase] = useState<TaskPhase>('AFTERNOON')
  const [selectedDuration, setSelectedDuration] = useState<number>(30)
  const [selectedHorizonId, setSelectedHorizonId] = useState<string | undefined>(undefined)
  const [scheduledDate, setScheduledDate] = useState<string>(currentDateStr)

  const availableTags = ['agency', 'personal', 'health']
  const durationOptions = [15, 30, 45, 60]
  const phaseOptions: { key: TaskPhase; label: string }[] = [
    { key: 'MORNING', label: 'Morning' },
    { key: 'AFTERNOON', label: 'Afternoon' },
    { key: 'EVENING', label: 'Evening' },
  ]

  useEffect(() => {
    setScheduledDate(currentDateStr)
  }, [currentDateStr])

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 10)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    if (text.trim()) {
      onSave(
        text.trim(),
        selectedTags,
        selectedPhase,
        selectedDuration,
        scheduledDate,
        selectedHorizonId,
        description.trim() || undefined
      )
      setText('')
      setDescription('')
      setSelectedTags([])
      setSelectedPhase('AFTERNOON')
      setSelectedDuration(30)
      setSelectedHorizonId(undefined)
      onClose()
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-[2.5rem] p-7 w-full max-w-md shadow-2xl relative z-10 animate-in slide-in-from-bottom-10 fade-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-black tracking-tight">New Task</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-black/50 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-16 text-base text-black bg-gray-50 p-4 rounded-3xl mb-3 focus:ring-1 focus:ring-black/5 focus:outline-none resize-none font-medium"
          placeholder="Task title (e.g. Sync with Design Team)"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSave()
            }
          }}
        />

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes or details..."
          className="w-full bg-gray-50 px-4 py-3 rounded-2xl text-xs font-medium text-black mb-4 focus:outline-none focus:ring-1 focus:ring-black/5"
        />

        <div className="mb-4">
          <label className="text-[11px] font-medium text-black/40 uppercase tracking-wider block mb-2 px-1">
            Schedule Date
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full bg-gray-50 px-4 py-2.5 rounded-full text-xs font-medium text-black focus:outline-none border border-transparent focus:border-black/10"
          />
        </div>

        <div className="mb-4">
          <label className="text-[11px] font-medium text-black/40 uppercase tracking-wider block mb-2 px-1">
            Link to Horizon
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedHorizonId(undefined)}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                !selectedHorizonId ? 'bg-black text-white' : 'text-black/60 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              None
            </button>
            {horizons.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedHorizonId(h.id)}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                  selectedHorizonId === h.id ? 'bg-black text-white' : 'text-black/60 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {h.title}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[11px] font-medium text-black/40 uppercase tracking-wider block mb-2 px-1">
            Phase
          </label>
          <div className="flex items-center gap-2">
            {phaseOptions.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelectedPhase(p.key)}
                className={`text-xs font-medium px-3.5 py-2 rounded-full transition-colors cursor-pointer ${
                  selectedPhase === p.key ? 'bg-black text-white' : 'text-black/60 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[11px] font-medium text-black/40 uppercase tracking-wider block mb-2 px-1">
            Duration
          </label>
          <div className="flex items-center gap-2">
            {durationOptions.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setSelectedDuration(mins)}
                className={`text-xs font-medium px-3.5 py-2 rounded-full transition-colors cursor-pointer ${
                  selectedDuration === mins ? 'bg-black text-white' : 'text-black/60 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-[11px] font-medium text-black/40 uppercase tracking-wider block mb-2 px-1">
            Tags
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                  selectedTags.includes(tag) ? 'bg-black text-white' : 'text-black/60 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full bg-black text-white text-[15px] font-medium py-4 rounded-full shadow-lg hover:bg-black/90 transition-colors cursor-pointer"
        >
          Save to TempoLS
        </button>
      </div>
    </div>
  )
}