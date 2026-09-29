import { useEffect, useState } from 'react'

export interface UndoToastPayload {
  message: string
  onUndo: () => void
}

interface UndoToastProps {
  toast: UndoToastPayload | null
  onDismiss: () => void
  durationMs?: number
}

export function UndoToast({ toast, onDismiss, durationMs = 5000 }: UndoToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!toast) {
      setIsVisible(false)
      return
    }

    // Mount → animate in
    setIsVisible(true)

    const timer = setTimeout(() => {
      setIsVisible(false)
      // Wait for the exit animation before actually clearing the toast
      setTimeout(onDismiss, 250)
    }, durationMs)

    return () => clearTimeout(timer)
  }, [toast, durationMs, onDismiss])

  if (!toast) return null

  return (
    <div className="fixed bottom-28 left-0 right-0 z-[150] flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto bg-black text-white rounded-full pl-4 pr-1.5 py-1.5 shadow-2xl flex items-center gap-3 max-w-md transition-all duration-250 ease-out ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <span className="text-[12px] font-medium truncate">{toast.message}</span>
        <button
          type="button"
          onClick={() => {
            toast.onUndo()
            setIsVisible(false)
            setTimeout(onDismiss, 250)
          }}
          className="text-[11px] font-bold uppercase tracking-wider bg-white/15 hover:bg-white/25 active:bg-white/30 px-3 py-1.5 rounded-full transition-colors shrink-0"
        >
          Undo
        </button>
      </div>
    </div>
  )
}