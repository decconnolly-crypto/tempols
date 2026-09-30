import type { Commitment } from '../types'

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, '0')}${suffix}`
}

interface CommitmentCardProps {
  commitment: Commitment
  onClick?: (commitment: Commitment) => void
  showActions?: boolean
  onOpenWeeklyView?: () => void
  onAddCommitment?: () => void
}

export function CommitmentCard({
  commitment,
  onClick,
  showActions,
  onOpenWeeklyView,
  onAddCommitment,
}: CommitmentCardProps) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.03)] flex items-stretch">
      {/* Top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

      {/* Tap target for the commitment itself */}
      <button
        type="button"
        onClick={() => onClick?.(commitment)}
        className="flex-1 min-w-0 text-left px-4 py-3 flex items-start gap-3 active:bg-white/20 transition-colors"
      >
        <div className="shrink-0 pt-0.5 relative z-10">
          <span className="text-[12px] font-semibold text-black/75 tabular-nums">
            {formatTime(commitment.startTime)}
          </span>
        </div>

        <div className="min-w-0 flex-1 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-black leading-snug">
              {commitment.title}
            </span>
            {commitment.child && (
              <span className="text-[10px] font-semibold text-[#5A3E2B] bg-[#D9C7B0]/70 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {commitment.child}
              </span>
            )}
          </div>
          {commitment.location && (
            <p className="text-[11px] font-medium text-black/45 mt-0.5">
              {commitment.location}
            </p>
          )}
        </div>

        {commitment.isRecurring && (
          <svg
            className="w-3.5 h-3.5 text-black/30 shrink-0 mt-0.5 relative z-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
      </button>

      {/* Inline actions */}
      {showActions && (onOpenWeeklyView || onAddCommitment) && (
        <div className="flex items-center gap-1 pr-3 pl-1 relative z-10 border-l border-white/40">
          {onOpenWeeklyView && (
            <button
              type="button"
              onClick={onOpenWeeklyView}
              aria-label="Week view"
              className="w-8 h-8 rounded-full hover:bg-white/50 active:bg-white/60 flex items-center justify-center text-black/50 hover:text-black transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {onAddCommitment && (
            <button
              type="button"
              onClick={onAddCommitment}
              aria-label="Add commitment"
              className="w-8 h-8 rounded-full hover:bg-white/50 active:bg-white/60 flex items-center justify-center text-black/50 hover:text-black transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}