import { useState, useEffect } from 'react'
import type { AppTask } from '../types'

interface TaskBreakdownModalProps {
  isOpen: boolean
  task: AppTask | null
  onClose: () => void
}

export function TaskBreakdownModal({ isOpen, task, onClose }: TaskBreakdownModalProps) {
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [checkedState, setCheckedState] = useState<boolean[]>([])

  useEffect(() => {
    if (isOpen && task) {
      setLoading(true)
      setSubtasks([])
      
      fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.title }),
      })
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data.subtasks) ? data.subtasks : []
          setSubtasks(list)
          setCheckedState(new Array(list.length).fill(false))
        })
        .catch((err) => console.error('Failed to decompose task:', err))
        .finally(() => setLoading(false))
    }
  }, [isOpen, task])

  if (!isOpen || !task) return null

  const toggleCheck = (index: number) => {
    setCheckedState((prev) => prev.map((val, i) => (i === index ? !val : val)))
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#F4F3F0] w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-black/5 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase bg-black text-white px-2.5 py-1 rounded-full">
              AI Breakdown
            </span>
            <h3 className="text-xl font-medium text-black mt-2 leading-tight">
              {task.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-black/60 hover:text-black cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="my-4 min-h-[160px] flex flex-col justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-black/50 text-xs font-medium py-8">
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Generating step-by-step breakdown...
            </div>
          ) : (
            <div className="space-y-2.5">
              {subtasks.map((step, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  className={`p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                    checkedState[idx]
                      ? 'bg-black/5 text-gray-400 line-through'
                      : 'bg-white text-black shadow-sm'
                  }`}
                >
                  <span className="text-xs font-medium pr-2">{step}</span>
                  <div
                    className={`w-4 h-4 rounded-full border-2 border-black flex items-center justify-center shrink-0 ${
                      checkedState[idx] ? 'bg-black' : ''
                    }`}
                  >
                    {checkedState[idx] && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 bg-black text-white rounded-full text-xs font-medium hover:bg-black/80 transition-colors cursor-pointer mt-2"
        >
          Got it, back to focus
        </button>
      </div>
    </div>
  )
}