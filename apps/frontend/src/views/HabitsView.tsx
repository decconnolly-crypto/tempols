import type { Habit } from '../types'

export function HabitsView({
  habits,
  onToggleHabit,
  onOpenCreate,
}: {
  habits: Habit[]
  onToggleHabit: (id: string) => void
  onOpenCreate: () => void
}) {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[2.2rem] font-medium text-black tracking-tight">Life System</h2>
        <button
          onClick={onOpenCreate}
          className="bg-black text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-md"
        >
          + New Habit
        </button>
      </div>

      <div className="space-y-4">
        {habits.map((hb) => (
          <div
            key={hb.id}
            onClick={() => onToggleHabit(hb.id)}
            className={`rounded-[2rem] p-6 flex justify-between items-center cursor-pointer transition-all ${
              hb.isCompletedToday
                ? 'bg-black/5 opacity-60'
                : 'bg-[#E5DCD6] hover:bg-[#dfd5ce] shadow-sm'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  hb.isCompletedToday ? 'bg-black text-white' : 'border-2 border-black'
                }`}
              >
                {hb.isCompletedToday && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className={`text-base font-medium ${hb.isCompletedToday ? 'text-gray-600 line-through' : 'text-black'}`}>
                  {hb.title}
                </h3>
                <span className="text-xs text-black/50 font-medium uppercase tracking-wider">
                  {hb.phase} · {hb.durationMinutes}m
                </span>
              </div>
            </div>

            <span className="text-xs font-medium px-4 py-2 rounded-full bg-black/10 text-black">
              🔥 {hb.streak} Day Streak
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}