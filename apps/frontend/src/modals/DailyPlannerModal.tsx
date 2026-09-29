import { useState } from 'react'
import type { AppTask } from '../types'

export interface SuggestedTask {
  title: string
  durationMinutes: number
  phase: 'MORNING' | 'AFTERNOON' | 'EVENING'
}

interface DailyPlannerModalProps {
  isOpen: boolean
  onClose: () => void
  existingTasks: AppTask[]
  onAddTasks: (tasks: SuggestedTask[]) => void
}

export function DailyPlannerModal({ isOpen, onClose, existingTasks, onAddTasks }: DailyPlannerModalProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    {
      role: 'model',
      text: "Good morning! Tell me what you need to achieve today, and I'll fit everything into your available schedule."
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [extractedTasks, setExtractedTasks] = useState<SuggestedTask[]>([])

  if (!isOpen) return null

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
          existingTasks
        })
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

  const handleConfirmTasks = () => {
    onAddTasks(extractedTasks)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#F4F3F0] w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl border border-black/5 flex flex-col h-[540px]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <h3 className="text-sm font-semibold text-black tracking-tight">Daily AI Coach</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center text-xs text-black/60 hover:text-black cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3.5 rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-black text-white rounded-br-none'
                    : 'bg-white text-black shadow-sm rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/80 p-3 rounded-2xl text-black/40 text-[11px] animate-pulse">
                Analyzing capacity & scheduling...
              </div>
            </div>
          )}
        </div>

        {/* Extracted Suggested Tasks Preview */}
        {extractedTasks.length > 0 && (
          <div className="my-3 p-3 bg-white rounded-2xl shadow-sm border border-black/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 block mb-2">
              Smart Schedule Preview ({extractedTasks.length})
            </span>
            <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
              {extractedTasks.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-medium text-black">
                  <span className="truncate pr-2">{t.title}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 text-black/70">
                      {t.phase}
                    </span>
                    <span className="text-black/40 text-[11px]">{t.durationMinutes}m</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleConfirmTasks}
              className="w-full mt-3 py-2 bg-black text-white rounded-full text-xs font-medium hover:bg-black/80 transition-all cursor-pointer"
            >
              Import Tasks to Schedule
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="What else do you need to do?"
            className="flex-1 bg-white border border-black/5 rounded-full px-4 py-2.5 text-xs text-black placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-black"
          />
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-2.5 bg-black text-white rounded-full text-xs font-medium cursor-pointer hover:bg-black/80"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}