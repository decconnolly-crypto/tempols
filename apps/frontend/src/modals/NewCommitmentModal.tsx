import { useState, useEffect } from 'react'

interface NewCommitmentModalProps {
  isOpen: boolean
  onClose: () => void
  currentDateStr: string
  onSave: (data: {
    title: string
    date: string
    startTime: string
    endTime?: string
    child?: string
    location?: string
    notes?: string
    recurrence: 'NONE' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'
    recurrenceEndDate?: string
  }) => void
}

const RECURRENCE_OPTIONS: Array<{
  value: 'NONE' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'
  label: string
}> = [
  { value: 'NONE', label: 'One-off' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'MONTHLY', label: 'Monthly' },
]

export function NewCommitmentModal({
  isOpen,
  onClose,
  currentDateStr,
  onSave,
}: NewCommitmentModalProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(currentDateStr)
  const [startTime, setStartTime] = useState('17:00')
  const [endTime, setEndTime] = useState('')
  const [child, setChild] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [recurrence, setRecurrence] = useState<
    'NONE' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'
  >('NONE')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setTitle('')
    setDate(currentDateStr)
    setStartTime('17:00')
    setEndTime('')
    setChild('')
    setLocation('')
    setNotes('')
    setRecurrence('NONE')
    setRecurrenceEndDate('')
    setError(null)
  }, [isOpen, currentDateStr])

  if (!isOpen) return null

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!date) {
      setError('Date is required.')
      return
    }
    if (!startTime) {
      setError('Start time is required.')
      return
    }

    onSave({
      title: title.trim(),
      date,
      startTime,
      endTime: endTime || undefined,
      child: child.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      recurrence,
      recurrenceEndDate: recurrenceEndDate || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-[2.5rem] p-7 w-full max-w-md shadow-2xl relative z-10 animate-in slide-in-from-bottom-10 fade-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-black tracking-tight">New Commitment</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-black/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is it? (e.g. Rainbows, School pickup)"
          className="w-full bg-gray-50 p-4 rounded-2xl text-black font-medium text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-black/10"
          autoFocus
        />

        {/* Date + time row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="col-span-2">
            <label className="text-[10px] font-medium text-black/40 uppercase tracking-wider block mb-1.5 px-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 px-3 py-3 rounded-2xl text-[13px] font-medium text-black focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-black/40 uppercase tracking-wider block mb-1.5 px-1">
              Start
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-gray-50 px-3 py-3 rounded-2xl text-[13px] font-medium text-black focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="text-[10px] font-medium text-black/40 uppercase tracking-wider block mb-1.5 px-1">
              End (optional)
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-gray-50 px-3 py-3 rounded-2xl text-[13px] font-medium text-black focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-black/40 uppercase tracking-wider block mb-1.5 px-1">
              Child (optional)
            </label>
            <input
              type="text"
              value={child}
              onChange={(e) => setChild(e.target.value)}
              placeholder="Aoife"
              className="w-full bg-gray-50 px-3 py-3 rounded-2xl text-[13px] font-medium text-black focus:outline-none placeholder:text-black/30"
            />
          </div>
        </div>

        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          className="w-full bg-gray-50 p-3.5 rounded-2xl text-[13px] font-medium text-black mb-3 focus:outline-none placeholder:text-black/30"
        />

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full bg-gray-50 p-3.5 rounded-2xl text-[13px] font-medium text-black mb-4 focus:outline-none resize-none placeholder:text-black/30"
        />

        {/* Recurrence */}
        <div className="mb-4">
          <label className="text-[10px] font-medium text-black/40 uppercase tracking-wider block mb-2 px-1">
            Repeats
          </label>
          <div className="flex gap-2 flex-wrap">
            {RECURRENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRecurrence(opt.value)}
                className={`text-[11px] font-medium px-3.5 py-2 rounded-full transition-colors ${
                  recurrence === opt.value
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-black/60 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {recurrence !== 'NONE' && (
          <div className="mb-4">
            <label className="text-[10px] font-medium text-black/40 uppercase tracking-wider block mb-1.5 px-1">
              Ends on (optional)
            </label>
            <input
              type="date"
              value={recurrenceEndDate}
              onChange={(e) => setRecurrenceEndDate(e.target.value)}
              className="w-full bg-gray-50 px-3 py-3 rounded-2xl text-[13px] font-medium text-black focus:outline-none"
            />
            <p className="text-[10px] font-medium text-black/30 mt-1.5 px-1">
              Leave blank for ongoing.
            </p>
          </div>
        )}

        {error && (
          <p className="text-[12px] font-medium text-rose-600 mb-3 text-center">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="w-full bg-black text-white text-[15px] font-medium py-4 rounded-full shadow-lg hover:bg-black/90 transition-colors"
        >
          Save Commitment
        </button>
      </div>
    </div>
  )
}