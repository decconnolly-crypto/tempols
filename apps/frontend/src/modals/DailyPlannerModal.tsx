import { useState, useEffect } from 'react'
import type { AppTask, Commitment, Habit } from '../types'

export interface SuggestedTask {
  title: string
  durationMinutes: number
  phase: 'MORNING' | 'AFTERNOON' | 'EVENING'
  scheduledDate?: string
}

interface DailyPlannerModalProps {
  isOpen: boolean
  onClose: () => void
  currentDateStr: string
  existingTasks: AppTask[]
  commitments?: Commitment[]
  habits?: Habit[]
  onAddTasks: (tasks: SuggestedTask[]) => void
}

const QUICK_PROMPTS = [
  'Focus on the site today',
  'Clear the admin',
  'Prep for tomorrow',
  'Just a light day',
]

function formatHeaderDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, '0')}${suffix}`
}

export function DailyPlannerModal({
  isOpen,
  onClose,
  currentDateStr,
  existingTasks,
  commitments = [],
  habits = [],
  onAddTasks,
}: DailyPlannerModalProps) {
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'model'; text: string }>
  >([
    {
      role: 'model',
      text: "What's on your mind today? Tell me your priorities and I'll fit them into your schedule.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [extractedTasks, setExtractedTasks] = useState<SuggestedTask[]>([])

  // Reset state each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          role: 'model',
          text: "What's on your mind today? Tell me your priorities and I'll fit them into your schedule.",
        },
      ])
      setInput('')
      setExtractedTasks([])
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const openTasks = existingTasks.filter((t) => !t.isCompleted && !t.habitId)
  const openHabits = habits.filter((h) => !h.isCompletedToday)
  const sortedCommitments = [...commitments].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )
  const hasContext =
    openTasks.length > 0 || sortedCommitments.length > 0 || openHabits.length > 0

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const newMessages = [...messages, { role: 'user' as const, text: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
        const res = await fetch('/api/ai/daily-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: newMessages,
              existingTasks,
              commitments,
              habits,
            }),
          })
      const data = await res.json()

      setMessages([...newMessages, { role: 'model', text: data.reply }])
      if (Array.isArray(data.suggestedTasks) && data.suggestedTasks.length > 0) {
        setExtractedTasks(data.suggestedTasks)
      }
    } catch (err) {
      console.error('Planner error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
  }

  const handleConfirmTasks = () => {
    onAddTasks(extractedTasks)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-white/70 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Top highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start px-6 pt-6 pb-4 border-b border-white/40 relative z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-black/70 animate-pulse" />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/45">
                Plan your day
              </h3>
            </div>
            <p className="text-[17px] font-medium text-black leading-tight">
              {formatHeaderDate(currentDateStr)}
            </p>
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

        {/* "Today so far" context block */}
        <div className="px-6 pt-4 pb-3 relative z-10">
          <div className="bg-white/40 backdrop-blur-sm border border-white/50 rounded-2xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-2">
              Today so far
            </p>

            {!hasContext ? (
              <p className="text-[12px] font-medium text-black/50">
                Nothing scheduled yet — clean slate.
              </p>
            ) : (
              <div className="space-y-2">
                {openTasks.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-black/35 mb-1">
                      Tasks
                    </p>
                    <div className="space-y-0.5">
                      {openTasks.slice(0, 4).map((t) => (
                        <p
                          key={t.id}
                          className="text-[12px] font-medium text-black/70 truncate"
                        >
                          {t.title}
                          <span className="text-black/35">
                            {' · '}
                            {t.durationMinutes}m · {t.phase}
                          </span>
                        </p>
                      ))}
                      {openTasks.length > 4 && (
                        <p className="text-[11px] font-medium text-black/35">
                          + {openTasks.length - 4} more
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {sortedCommitments.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-black/35 mb-1">
                      Commitments
                    </p>
                    <div className="space-y-0.5">
                      {sortedCommitments.map((c) => (
                        <p
                          key={`${c.id}-${c.occurrenceDate}`}
                          className="text-[12px] font-medium text-black/70 truncate"
                        >
                          {c.title}
                          <span className="text-black/35">
                            {' · '}
                            {formatTime(c.startTime)}
                            {c.child && ` · ${c.child}`}
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {openHabits.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-black/35 mb-1">
                      Habits
                    </p>
                    <p className="text-[12px] font-medium text-black/70">
                      {openHabits.map((h) => h.title).join(' · ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-6 space-y-3 relative z-10">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] p-3.5 rounded-2xl text-[13px] ${
                  m.role === 'user'
                    ? 'bg-black text-white rounded-br-none shadow-sm'
                    : 'bg-white/70 backdrop-blur-sm border border-white/60 text-black rounded-bl-none shadow-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/60 backdrop-blur-sm border border-white/50 p-3 rounded-2xl text-black/40 text-[12px] animate-pulse">
                Thinking...
              </div>
            </div>
          )}

          {/* Quick-pick chips — only show while conversation is fresh */}
          {messages.length === 1 && !loading && extractedTasks.length === 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleQuickPrompt(prompt)}
                  className="text-[11px] font-medium text-black/70 bg-white/50 backdrop-blur-sm border border-white/60 px-3 py-1.5 rounded-full hover:bg-white/80 hover:text-black transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Suggested tasks preview */}
          {extractedTasks.length > 0 && (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/60 shadow-sm mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 block mb-2">
                Proposed ({extractedTasks.length})
              </span>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {extractedTasks.map((t, idx) => {
                  const isDifferentDay =
                    t.scheduledDate && t.scheduledDate !== currentDateStr
                  const shortDate = t.scheduledDate
                    ? new Date(t.scheduledDate).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })
                    : null

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[12px] font-medium text-black"
                    >
                      <span className="truncate pr-2">{t.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isDifferentDay && shortDate && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/10 text-black/70">
                            {shortDate}
                          </span>
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 text-black/60">
                          {t.phase}
                        </span>
                        <span className="text-black/40 text-[11px]">
                          {t.durationMinutes}m
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={handleConfirmTasks}
                className="w-full mt-3 py-2.5 bg-black text-white rounded-full text-[12px] font-semibold hover:bg-black/85 transition-colors"
              >
                Add to today ({extractedTasks.length})
              </button>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-6 pt-3 pb-6 relative z-10">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="What else do you need to do?"
              className="flex-1 bg-white/60 backdrop-blur-sm border border-white/60 rounded-full px-4 py-3 text-[13px] text-black placeholder:text-black/35 focus:outline-none focus:ring-1 focus:ring-black/20"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-3 bg-black text-white rounded-full text-[12px] font-semibold hover:bg-black/85 disabled:opacity-40 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}