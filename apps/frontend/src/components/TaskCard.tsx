import { useRef, useCallback } from 'react'
import { useLocation } from 'wouter'
import type { AppTask, Horizon } from '../types'

function getTaskTheme(tags: string[]) {
  if (tags.includes('personal') || tags.includes('life')) {
    return 'bg-[#D6E5E0] active:bg-[#cbe0d9]'
  }
  if (tags.includes('health') || tags.includes('fitness')) {
    return 'bg-[#E5D6DC] active:bg-[#dfcbcf]'
  }
  return 'bg-[#E5DCD6] active:bg-[#dfd5ce]'
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

  if (task.isCompleted) {
    return (
      <div className="bg-black/5 rounded-[1.75rem] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
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
          <span className="text-[13px] font-medium text-gray-500 line-through truncate">
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {horizon && (
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              {horizon.title}
            </span>
          )}
        </div>
      </div>
    )
  }

  const colorStyle = getTaskTheme(task.tags)

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
      className={`${colorStyle} rounded-[1.75rem] p-5 flex items-start gap-3.5 cursor-pointer transition-colors relative select-none`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(task.id)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-0.5 min-w-[22px] h-[22px] rounded-full border-[2px] border-black flex items-center justify-center active:bg-black/10 transition-colors"
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-medium text-black mb-1.5 leading-snug">
          {task.title}
        </h3>
        {task.description && (
          <p className="text-[12px] font-medium text-black/55 mb-3 leading-snug">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-black bg-black/5 px-2.5 py-1 rounded-full">
            {task.durationMinutes}m
          </span>
          {horizon && (
            <span className="text-[11px] font-semibold text-black bg-black/10 px-2.5 py-1 rounded-full">
              {horizon.title}
            </span>
          )}
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium text-black bg-black/5 px-2.5 py-1 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}