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
}

export function CommitmentCard({ commitment, onClick }: CommitmentCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(commitment)}
      className="w-full text-left bg-[#EBE8E3] rounded-2xl px-4 py-3 flex items-start gap-3 active:bg-[#e0dcd5] transition-colors"
    >
      {/* Time column */}
      <div className="shrink-0 pt-0.5">
        <span className="text-[12px] font-semibold text-black/70 tabular-nums">
          {formatTime(commitment.startTime)}
        </span>
      </div>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-black leading-snug">
            {commitment.title}
          </span>
          {commitment.child && (
            <span className="text-[10px] font-semibold text-[#5A3E2B] bg-[#D9C7B0] px-2 py-0.5 rounded-full">
              {commitment.child}
            </span>
          )}
        </div>
        {commitment.location && (
          <p className="text-[11px] font-medium text-black/40 mt-0.5">
            {commitment.location}
          </p>
        )}
      </div>

      {/* Recurring indicator */}
      {commitment.isRecurring && (
        <svg
          className="w-3.5 h-3.5 text-black/25 shrink-0 mt-0.5"
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
  )
}