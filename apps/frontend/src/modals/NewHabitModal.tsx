import { useState } from 'react'
import type { TempoTask } from '@tempols/core'

export function NewHabitModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (title: string, phase: TempoTask['phase'], duration: number) => void
}) {
  const [title, setTitle] = useState('')
  const [phase, setPhase] = useState<TempoTask['phase']>('MORNING')
  const [duration, setDuration] = useState(20)

  if (!isOpen) return null

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim(), phase, duration)
      setTitle('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-[2.5rem] p-7 w-full max-w-md shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-xl font-medium text-black mb-6">Create New Habit</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Habit Title (e.g. Daily Meditation)"
          className="w-full bg-gray-50 p-4 rounded-2xl text-black font-medium text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-black/10"
        />
        <div className="flex gap-2 mb-4">
          {(['MORNING', 'AFTERNOON', 'EVENING'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`text-xs px-3.5 py-2 rounded-full font-medium ${
                phase === p ? 'bg-black text-white' : 'bg-gray-100 text-black/60'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-6">
          {[15, 20, 30, 45].map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`text-xs px-3.5 py-2 rounded-full font-medium ${
                duration === d ? 'bg-black text-white' : 'bg-gray-100 text-black/60'
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
        <button
          onClick={handleSave}
          className="w-full bg-black text-white text-sm font-medium py-4 rounded-full shadow-lg"
        >
          Save Habit
        </button>
      </div>
    </div>
  )
}