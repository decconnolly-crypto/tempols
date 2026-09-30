import { useRef, useCallback } from 'react'
import { useLocation } from 'wouter'
import type { AppTask, Horizon } from '../types'

function getTaskTint(tags: string[]) {
  // Very subtle tint, layered on the glass
  if (tags.includes('personal') || tags.includes('life')) {
    return 'from-[#D6E5E0]/30 to-[#D6E5E0]/10'
  }
  if (tags.includes('health') || tags.includes('fitness')) {
    return 'from-[#E5D6DC]/30 to-[#E5D6DC]/10'
  }
  return 'from-[#E5DCD6]/30 to-[#E5DCD6]/10'
}

interface TaskCardProps {
  task: AppTask
  horizon?: Horizon
  onToggle: (id: string) => void
  onLongPress?: (task: AppTask) => void
}

export function TaskCard({ task, horizon, onToggle, onLongPress }: TaskCardProps) {
  const [, setLocation] = useLocation()
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  const startLongPress = useCallback(() => {
    if (!onLongPress) return
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      if (navigator.vibrate) navigator.vibrate(15)
      onLongPress(task)
    }, 450)
  }, [onLongPress, task])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleClick = useCallback(() => {
    if (didLongPress.current) {
      didLongPress.current = false
      return
    }
    setLocation(`/focus/${task.id}`)
  }, [setLocation, task.id])

  // Completed state — more muted glass
  if (task.isCompleted) {
    return (
      <div className="relative rounded-[1.75rem] p-4 flex items-center justify-between overflow-hidden bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 min-w-0 relative z-10">
          <button
            type="button"
            onClick={() => onToggle(task.id)}
            className="min-w-[22px] h-5 w-5 rounded-full bg-black flex items-center justify-center shrink-0"
          >
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <span className="text-[13px] font-medium text-black/45 line-through truncate">
            {task.title}
          </span>
        </div>
        {horizon && (
          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full shrink-0 relative z-10">
            {horizon.title}
          </span>
        )}
      </div>
    )
  }

  const tint = getTaskTint(task.tags)

  return (
    <div
      onClick={handleClick}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault()
          onLongPress(task)
        }
      }}
      className="relative rounded-[1.75rem] p-5 flex items-start gap-3.5 cursor-pointer overflow-hidden transition-all active:scale-[0.995] select-none bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.03)] hover:bg-white/70"
    >
      {/* Top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

      {/* Tonal tint overlay — preserves tag-based colour, but subtle */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${tint} pointer-events-none`}
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(task.id)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-0.5 min-w-[22px] h-[22px] rounded-full border-[2px] border-black flex items-center justify-center active:bg-black/10 transition-colors shrink-0 relative z-10"
      />
      <div className="flex-1 min-w-0 relative z-10">
        <h3 className="text-[15px] font-medium text-black mb-1.5 leading-snug">
          {task.title}
        </h3>
        {task.description && (
          <p className="text-[12px] font-medium text-black/55 mb-3 leading-snug">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-black/80 bg-white/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/50">
            {task.durationMinutes}m
          </span>
          {horizon && (
            <span className="text-[11px] font-semibold text-black/80 bg-white/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/50">
              {horizon.title}
            </span>
          )}
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium text-black/70 bg-white/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/50"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}