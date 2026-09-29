import { useRoute, useLocation } from 'wouter'
import type { AppTask } from '../../types'

export function ActiveFocusView({
  tasks,
  toggleTask,
}: {
  tasks: AppTask[]
  toggleTask: (id: string) => void
}) {
  const [, params] = useRoute('/focus/:id')
  const [, setLocation] = useLocation()

  const task = tasks.find((t) => t.id === params?.id)

  if (!task) {
    setLocation('/')
    return null
  }

  const handleComplete = () => {
    if (!task.isCompleted) toggleTask(task.id)
    setLocation('/')
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#E5DCD6] flex flex-col items-center justify-between p-8 animate-in fade-in duration-300">
      <div className="w-full flex justify-end">
        <button
          onClick={() => setLocation('/')}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors"
        >
          <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm text-center -mt-12">
        <span className="text-[8rem] font-medium text-black leading-none tracking-tighter mb-8">
          {task.durationMinutes}<span className="text-[3rem] text-black/40">m</span>
        </span>
        <h2 className="text-2xl font-medium text-black tracking-tight mb-4">{task.title}</h2>
        {task.description && <p className="text-[15px] font-medium text-black/60 mb-8">{task.description}</p>}
        <div className="flex gap-2">
          {task.tags.map((tag) => (
            <span key={tag} className="text-xs font-medium text-black bg-black/5 px-4 py-2 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={handleComplete}
        className="w-full max-w-sm bg-black text-white text-[16px] font-medium py-5 rounded-full shadow-2xl hover:scale-[1.02] transition-transform active:scale-95"
      >
        Complete & Return
      </button>
    </div>
  )
}