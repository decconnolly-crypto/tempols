import { useState, useEffect, useRef } from 'react'

interface PlanTask {
  title: string
  milestoneTitle: string
  durationMinutes: number
  phase: 'MORNING' | 'AFTERNOON' | 'EVENING'
  scheduledDate: string
}

interface PlanMilestone {
  title: string
  description: string
  weekNumber: number
  targetDate: string
}

interface PlanHorizon {
  title: string
  description: string
  targetTag: string
  quarter: string
  startDate: string
  targetDate: string
  keyResults: string[]
}

interface Plan {
  horizon: PlanHorizon
  milestones: PlanMilestone[]
  tasks: PlanTask[]
}

interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

interface QuarterPlannerModalProps {
  isOpen: boolean
  onClose: () => void
  currentDateStr: string
  onCommitted: () => void
}

export function QuarterPlannerModal({
  isOpen,
  onClose,
  currentDateStr,
  onCommitted,
}: QuarterPlannerModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'What do you want to achieve this quarter? Give me the goal in your own words and I will ask a few questions before proposing a plan.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, plan])

  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          role: 'model',
          text: 'What do you want to achieve this quarter? Give me the goal in your own words and I will ask a few questions before proposing a plan.',
        },
      ])
      setInput('')
      setPlan(null)
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading || plan) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: trimmed }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/plan-quarter/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()

      if (data.type === 'plan' && data.plan) {
        setMessages([
          ...newMessages,
          { role: 'model', text: data.reply || 'Here is the plan.' },
        ])
        setPlan(data.plan)
      } else {
        setMessages([
          ...newMessages,
          { role: 'model', text: data.reply || 'Tell me more.' },
        ])
      }
    } catch (err) {
      console.error('Plan-quarter interview error:', err)
      setError('Could not reach the AI. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    if (!plan) return
    setCommitting(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/plan-quarter/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, scheduledDate: currentDateStr }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      onCommitted()
      onClose()
    } catch (err) {
      console.error('Plan-quarter commit error:', err)
      setError('Could not commit the plan. Try again.')
    } finally {
      setCommitting(false)
    }
  }

  const removeMilestone = (index: number) => {
    if (!plan) return
    setPlan({
      ...plan,
      milestones: plan.milestones.filter((_, i) => i !== index),
    })
  }

  const removeTask = (index: number) => {
    if (!plan) return
    setPlan({
      ...plan,
      tasks: plan.tasks.filter((_, i) => i !== index),
    })
  }

  const totalTasks = plan?.tasks.length ?? 0
  const totalMilestones = plan?.milestones.length ?? 0

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="bg-[#F4F3F0] w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl relative z-10 flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <h3 className="text-sm font-semibold text-black tracking-tight">
              Quarterly Planning Coach
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center text-xs text-black/60 hover:text-black cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Chat / Plan scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs mb-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl ${
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
                Thinking...
              </div>
            </div>
          )}

          {/* Plan review block */}
          {plan && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 space-y-4 mt-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 block mb-1">
                  Horizon
                </span>
                <p className="text-[13px] font-semibold text-black">
                  {plan.horizon.title}
                </p>
                {plan.horizon.description && (
                  <p className="text-[11px] text-black/50 mt-1">
                    {plan.horizon.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] font-medium text-black bg-black/5 px-2 py-0.5 rounded-full">
                    #{plan.horizon.targetTag}
                  </span>
                  {plan.horizon.quarter && (
                    <span className="text-[10px] font-medium text-black bg-black/5 px-2 py-0.5 rounded-full">
                      {plan.horizon.quarter}
                    </span>
                  )}
                </div>
              </div>

              {plan.horizon.keyResults.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 block mb-1">
                    Key Results
                  </span>
                  <ul className="space-y-1">
                    {plan.horizon.keyResults.map((kr, i) => (
                      <li key={i} className="text-[11px] text-black flex gap-2">
                        <span className="text-black/30">•</span>
                        <span>{kr}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
                    Milestones ({totalMilestones})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {plan.milestones.map((m, i) => (
                    <div
                      key={i}
                      className="bg-[#F4F3F0] rounded-xl px-3 py-2 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-bold text-black/40 uppercase tracking-wider">
                            W{m.weekNumber}
                          </span>
                          <span className="text-[9px] text-black/30">
                            {m.targetDate}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-black truncate">
                          {m.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMilestone(i)}
                        className="text-[10px] text-black/30 hover:text-black shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 block mb-1.5">
                  Tasks ({totalTasks})
                </span>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {plan.tasks.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 py-1"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-black truncate">
                          {t.title}
                        </p>
                        <p className="text-[9px] text-black/40">
                          {t.scheduledDate} · {t.durationMinutes}m · {t.phase}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTask(i)}
                        className="text-[10px] text-black/30 hover:text-black shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-[11px] font-medium text-rose-600 text-center">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleCommit}
                disabled={committing}
                className="w-full bg-black text-white text-[12px] font-semibold py-3 rounded-full hover:bg-black/80 transition-colors disabled:opacity-50"
              >
                {committing
                  ? 'Committing...'
                  : `Commit plan (${totalMilestones} milestones, ${totalTasks} tasks)`}
              </button>
            </div>
          )}
        </div>

        {/* Input bar — hidden once a plan is generated */}
        {!plan && (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Describe your quarter goal..."
              className="flex-1 bg-white border border-black/5 rounded-full px-4 py-2.5 text-xs text-black placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-black"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="px-4 py-2.5 bg-black text-white rounded-full text-xs font-medium cursor-pointer hover:bg-black/80 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  )
}