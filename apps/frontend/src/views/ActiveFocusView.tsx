import { useState, useEffect } from 'react'
import { useRoute, useLocation } from 'wouter'
import type { AppTask } from '../types'

interface ActiveFocusViewProps {
  tasks: AppTask[]
  toggleTask: (id: string) => void
  onOpenBreakdown?: (task: AppTask) => void
}

export function ActiveFocusView({ tasks, toggleTask, onOpenBreakdown }: ActiveFocusViewProps) {
  const [, params] = useRoute('/focus/:id')
  const [, setLocation] = useLocation()
  const activeTaskId = params?.id

  const activeTask = tasks.find((t) => t.id === activeTaskId)

  // Daily Pace calculations
  const total = tasks.length
  const completed = tasks.filter((t) => t.isCompleted).length
  const pace = total === 0 ? 0 : Math.round((completed / total) * 100)

  // Next Up calculations
  const pendingTasks = tasks.filter((t) => !t.isCompleted && t.id !== activeTaskId && !t.habitId)
  const nextTask = pendingTasks.length > 0 ? pendingTasks[0] : null

  // Timer state
  const initialSeconds = (activeTask?.durationMinutes || 25) * 60
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (activeTask) {
      setSecondsRemaining((activeTask.durationMinutes || 25) * 60)
      setIsActive(false)
    }
  }, [activeTaskId, activeTask?.durationMinutes])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1)
      }, 1000)
    } else if (secondsRemaining === 0) {
      setIsActive(false)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, secondsRemaining])

  const toggleTimer = () => {
    setIsActive((prev) => !prev)
  }

  const handleCompleteActiveTask = () => {
    if (!activeTask) return
    toggleTask(activeTask.id)
    if (nextTask) {
      setLocation(`/focus/${nextTask.id}`)
    } else {
      setLocation('/')
    }
  }

  const handleJumpToNextTask = () => {
    if (nextTask) {
      setLocation(`/focus/${nextTask.id}`)
    }
  }

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!activeTask) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-black/50 font-medium space-y-4">
        <div className="text-sm">Task completed!</div>
        <button
          type="button"
          onClick={() => setLocation('/')}
          className="px-4 py-1.5 bg-black text-white rounded-full text-xs font-medium cursor-pointer"
        >
          Back to Today
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col pt-8 animate-in fade-in duration-300">
      {/* Top Section: Header & Avatar */}
      <div className="flex items-start justify-between mb-8">
        <h1 className="text-4xl font-semibold text-black tracking-tight leading-[1.1]">
          Active<br />Focus
        </h1>
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-medium text-xs text-black shadow-sm">
          DC
        </div>
      </div>

      {/* Middle Section: Perfectly Aligned Centered Container */}
      <div className="flex-1 flex flex-col items-center justify-center mb-8">
        {/* Fixed 60x60 Relative Parent Container */}
        <div className="relative w-60 h-60 flex items-center justify-center">
          
          {/* Concentric Pulse Ring 1 */}
          <div
            className={`absolute w-72 h-72 rounded-full border pointer-events-none transition-all duration-500 ${
              isActive ? 'border-black/25 animate-ping opacity-20' : 'border-black/5 scale-100'
            }`}
          />

          {/* Concentric Pulse Ring 2 */}
          <div
            className={`absolute w-84 h-84 rounded-full border pointer-events-none transition-all duration-500 ${
              isActive ? 'border-black/15 animate-pulse' : 'border-black/5 scale-100'
            }`}
          />

          {/* Core Focus Circle */}
          <div className="relative w-full h-full bg-[#F4F3F0] rounded-full shadow-lg flex flex-col items-center justify-between p-7 z-10">
            {/* Pause / Start Toggle */}
            <button
              type="button"
              onClick={toggleTimer}
              className="text-[10px] font-semibold tracking-wider uppercase text-black/40 hover:text-black transition-colors cursor-pointer pt-1"
            >
              {isActive ? 'Pause' : 'Start Focus'}
            </button>

            {/* Center Title & Timer */}
            <div className="text-center px-3">
              <h2 className="text-[0.95rem] font-medium leading-snug text-black mb-1 line-clamp-2">
                {activeTask.title}
              </h2>
              <div
                onClick={toggleTimer}
                className="text-2xl font-mono font-semibold tracking-tight text-black/80 cursor-pointer select-none my-0.5"
              >
                {formatTime(secondsRemaining)}
              </div>
            </div>

            {/* Breakdown Trigger */}
            <button
              type="button"
              onClick={() => onOpenBreakdown?.(activeTask)}
              className="text-[11px] text-black/45 hover:text-black font-medium transition-colors cursor-pointer pb-0.5"
            >
              Tap for Task Breakdown
            </button>
          </div>
        </div>

        {/* Complete Task Pill */}
        <button
          type="button"
          onClick={handleCompleteActiveTask}
          className="mt-6 px-5 py-2 bg-black text-white rounded-full text-xs font-medium hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer z-20"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Complete Task
        </button>
      </div>

      {/* Bottom Section: Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Daily Pace Card */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm flex flex-col justify-between aspect-square">
          <div>
            <h3 className="text-[13px] font-semibold text-black">Daily Pace</h3>
            <p className="text-[11px] text-gray-500">Tasks completed</p>
            <div className="mt-4 grid grid-cols-3 gap-1.5 w-9">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
            </div>
          </div>
          <div className="text-[3.2rem] leading-none font-medium tracking-tighter text-black mt-2">
            {pace}%
          </div>
        </div>

        {/* Next Up Card */}
        <div
          onClick={handleJumpToNextTask}
          className={`bg-[#E5DFD3] rounded-[2rem] p-5 shadow-sm flex flex-col justify-between aspect-square transition-transform ${
            nextTask ? 'cursor-pointer hover:scale-[1.02]' : ''
          }`}
        >
          <div>
            <h3 className="text-[13px] font-semibold text-black">Next Up</h3>
            <p className="text-[11px] text-gray-700 font-medium truncate mt-0.5">
              {nextTask ? nextTask.title : 'No tasks remaining'}
            </p>
            <div className="mt-4 flex gap-1.5">
              <div className="w-4 h-1.5 rounded-full bg-black" />
              <div className="w-7 h-1.5 rounded-full bg-black/20" />
            </div>
          </div>

          <div className="text-[2.8rem] leading-none font-medium tracking-tighter text-black mt-2 flex items-baseline gap-0.5">
            {nextTask ? nextTask.durationMinutes : 0}
            <span className="text-lg font-normal tracking-normal">m</span>
          </div>
        </div>
      </div>
    </div>
  )
}