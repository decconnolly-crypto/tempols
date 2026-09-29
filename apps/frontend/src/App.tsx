import { useState, useEffect, useCallback } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import type { TempoTask } from '@tempols/core'
import type { AppTask, Horizon, Habit } from './types'
import { formatDateStr } from './utils/date'

import { BottomNav } from './components/BottomNav'
import { QuickCaptureModal } from './modals/QuickCaptureModal'
import { NewHorizonModal } from './modals/NewHorizonModal'
import { NewHabitModal } from './modals/NewHabitModal'
import { TaskTriageModal } from './components/TaskTriageModal'
import { UndoToast, type UndoToastPayload } from './components/UndoToast'

import { TodayView } from './views/TodayView'
import { HorizonsView } from './views/HorizonsView'
import { HabitsView } from './views/HabitsView'
import { ActiveFocusView } from './views/ActiveFocusView'
import { TaskBreakdownModal } from './modals/TaskBreakdownModal'
import { DailyPlannerModal } from './modals/DailyPlannerModal'

export default function App() {
  const [tasks, setTasks] = useState<AppTask[]>([])
  const [horizons, setHorizons] = useState<Horizon[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [currentDateStr, setCurrentDateStr] = useState<string>(formatDateStr(new Date()))
  const [isDailyPlannerOpen, setIsDailyPlannerOpen] = useState(false)

  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false)
  const [isNewHorizonOpen, setIsNewHorizonOpen] = useState(false)
  const [isNewHabitOpen, setIsNewHabitOpen] = useState(false)
  const [isTriageOpen, setIsTriageOpen] = useState(false)
  const [breakdownTask, setBreakdownTask] = useState<AppTask | null>(null)
  const [actionTask, setActionTask] = useState<AppTask | null>(null)

  const [undoToast, setUndoToast] = useState<UndoToastPayload | null>(null)

  const [, setLocation] = useLocation()

  const showUndo = useCallback((message: string, onUndo: () => void) => {
    setUndoToast({ message, onUndo })
  }, [])

  const dismissUndo = useCallback(() => {
    setUndoToast(null)
  }, [])

  const handleAddPlannerTasks = async (
    suggestedTasks: Array<{ title: string; durationMinutes: number; phase: 'MORNING' | 'AFTERNOON' | 'EVENING' }>
  ) => {
    try {
      await Promise.all(
        suggestedTasks.map((t) =>
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: t.title,
              durationMinutes: t.durationMinutes || 30,
              phase: t.phase || 'MORNING',
              scheduledDate: currentDateStr,
            }),
          })
        )
      )

      fetchForDate(currentDateStr)
    } catch (err) {
      console.error('Failed to import AI tasks:', err)
    }
  }

  const syncState = (data: { tasks: AppTask[]; horizons: Horizon[]; habits: Habit[] }) => {
    setTasks(data.tasks || [])
    setHorizons(data.horizons || [])
    setHabits(data.habits || [])
  }

  const fetchForDate = (dateStr: string) => {
    fetch(`/api/feed?date=${dateStr}`)
      .then((res) => res.json())
      .then((data) => {
        syncState(data)
        const fetchedTasks = data.tasks || []
        const overdue = fetchedTasks.filter(
          (t: AppTask) => !t.isCompleted && !t.habitId && Boolean(t.scheduledDate) && t.scheduledDate! < dateStr
        )
        if (overdue.length > 0) {
          setIsTriageOpen(true)
        }
      })
      .catch((err) => console.error('Error syncing:', err))
  }

  useEffect(() => {
    fetchForDate(currentDateStr)
  }, [currentDateStr])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsQuickCaptureOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function changeDate(offsetDays: number) {
    const [year, month, day] = currentDateStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    d.setDate(d.getDate() + offsetDays)

    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    setCurrentDateStr(`${yyyy}-${mm}-${dd}`)
  }

  function toggleTask(id: string) {
    const task = tasks.find((t) => t.id === id)
    const wasCompleted = task?.isCompleted ?? false
    const nextState = !wasCompleted

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: nextState } : t)))

    if (navigator.vibrate) navigator.vibrate(10)

    if (nextState) {
      showUndo('Task completed', () => {
        // Undo: toggle back
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: false } : t)))
        fetch(`/api/tasks/${id}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledDate: currentDateStr }),
        })
          .then((res) => res.json())
          .then(syncState)
          .catch((err) => console.error('Error undoing task:', err))
      })
    }

    fetch(`/api/tasks/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledDate: currentDateStr }),
    })
      .then((res) => res.json())
      .then(syncState)
      .catch((err) => console.error('Error toggling task:', err))
  }

  function toggleHabit(id: string) {
    const habit = habits.find((h) => h.id === id)
    const wasCompleted = habit?.isCompletedToday ?? false
    const nextState = !wasCompleted

    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, isCompletedToday: nextState } : h)))

    if (navigator.vibrate) navigator.vibrate(10)

    if (nextState && habit) {
      showUndo(`${habit.title} done`, () => {
        setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, isCompletedToday: false } : h)))
        fetch(`/api/habits/${id}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledDate: currentDateStr }),
        })
          .then((res) => res.json())
          .then(syncState)
          .catch((err) => console.error('Error undoing habit:', err))
      })
    }

    fetch(`/api/habits/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledDate: currentDateStr }),
    })
      .then((res) => res.json())
      .then(syncState)
      .catch((err) => console.error('Error toggling habit:', err))
  }

  function addTask(
    title: string,
    tags: string[],
    phase: TempoTask['phase'],
    durationMinutes: number,
    scheduledDate: string,
    horizonId?: string,
    description?: string
  ) {
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        tags: tags.map((t) => t.toLowerCase()),
        phase,
        durationMinutes,
        horizonId,
        scheduledDate,
        description,
      }),
    })
      .then(() => fetchForDate(scheduledDate))
      .catch((err) => console.error('Error creating task:', err))
  }

  function addHorizon(title: string, targetTag: string) {
    fetch('/api/horizons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, targetTag, scheduledDate: currentDateStr }),
    })
      .then((res) => res.json())
      .then(syncState)
      .catch((err) => console.error('Error creating horizon:', err))
  }

  function addHabit(title: string, phase: TempoTask['phase'], durationMinutes: number) {
    fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, phase, durationMinutes, scheduledDate: currentDateStr }),
    })
      .then((res) => res.json())
      .then(syncState)
      .catch((err) => console.error('Error creating habit:', err))
  }

  const handleKeepForToday = (taskId: string) => {
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledDate: currentDateStr }),
    }).then(() => fetchForDate(currentDateStr))
  }

  const handleMoveToBacklog = (taskId: string) => {
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledDate: 'BACKLOG' }),
    }).then(() => fetchForDate(currentDateStr))
  }

  const handleDropTask = (taskId: string) => {
    fetch(`/api/tasks/${taskId}`, { method: 'DELETE' }).then(() => fetchForDate(currentDateStr))
  }

  const coreTasks = tasks.filter((t) => !t.habitId)

  const overdueTasks = coreTasks.filter(
    (t) => !t.isCompleted && Boolean(t.scheduledDate) && t.scheduledDate! < currentDateStr
  )

  return (
    <div className="min-h-screen bg-[#9CA3AF] text-black font-sans p-5 pb-32">
      <div className="max-w-md mx-auto relative h-full">
        <Switch>
          <Route
            path="/"
            component={() => (
              <TodayView
                tasks={coreTasks}
                habits={habits}
                horizons={horizons}
                toggleTask={toggleTask}
                toggleHabit={toggleHabit}
                currentDateStr={currentDateStr}
                onChangeDate={changeDate}
                onOpenPlanner={() => setIsDailyPlannerOpen(true)}
                onOpenTaskActions={(t) => setActionTask(t)}
              />
            )}
          />
          <Route
            path="/horizons"
            component={() => <HorizonsView horizons={horizons} onOpenCreate={() => setIsNewHorizonOpen(true)} />}
          />
          <Route
            path="/habits"
            component={() => (
              <HabitsView habits={habits} onToggleHabit={toggleHabit} onOpenCreate={() => setIsNewHabitOpen(true)} />
            )}
          />
          <Route
            path="/focus/:id"
            component={() => (
              <ActiveFocusView
                tasks={coreTasks}
                toggleTask={toggleTask}
                onOpenBreakdown={(t) => setBreakdownTask(t)}
              />
            )}
          />
        </Switch>
      </div>

      <BottomNav onOpenCapture={() => setIsQuickCaptureOpen(true)} />

      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        horizons={horizons}
        currentDateStr={currentDateStr}
        onSave={addTask}
      />

      <NewHorizonModal
        isOpen={isNewHorizonOpen}
        onClose={() => setIsNewHorizonOpen(false)}
        onSave={addHorizon}
      />

      <NewHabitModal
        isOpen={isNewHabitOpen}
        onClose={() => setIsNewHabitOpen(false)}
        onSave={addHabit}
      />

      <TaskBreakdownModal
        isOpen={Boolean(breakdownTask)}
        task={breakdownTask}
        onClose={() => setBreakdownTask(null)}
      />

      <DailyPlannerModal
        isOpen={isDailyPlannerOpen}
        onClose={() => setIsDailyPlannerOpen(false)}
        existingTasks={tasks}
        onAddTasks={handleAddPlannerTasks}
      />

      <TaskTriageModal
        isOpen={isTriageOpen}
        overdueTasks={overdueTasks}
        onKeepForToday={handleKeepForToday}
        onMoveToBacklog={handleMoveToBacklog}
        onDropTask={handleDropTask}
        onClose={() => setIsTriageOpen(false)}
      />

      {actionTask && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setActionTask(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-t-[2rem] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 bg-black/15 rounded-full" />
            </div>
            <h3 className="text-base font-medium text-black mb-1 truncate">{actionTask.title}</h3>
            <p className="text-[12px] text-black/50 mb-5">
              {actionTask.durationMinutes}m · {actionTask.phase}
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  toggleTask(actionTask.id)
                  setActionTask(null)
                }}
                className="w-full bg-black text-white text-[13px] font-semibold py-3.5 rounded-full active:scale-[0.98] transition-transform"
              >
                {actionTask.isCompleted ? 'Mark incomplete' : 'Mark complete'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLocation(`/focus/${actionTask.id}`)
                  setActionTask(null)
                }}
                className="w-full bg-gray-100 text-black text-[13px] font-semibold py-3.5 rounded-full active:scale-[0.98] transition-transform"
              >
                Start focus
              </button>

              <button
                type="button"
                onClick={() => {
                  setBreakdownTask(actionTask)
                  setActionTask(null)
                }}
                className="w-full bg-gray-100 text-black text-[13px] font-semibold py-3.5 rounded-full active:scale-[0.98] transition-transform"
              >
                AI breakdown
              </button>

              <button
                type="button"
                onClick={() => setActionTask(null)}
                className="w-full text-black/50 text-[12px] font-medium py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <UndoToast toast={undoToast} onDismiss={dismissUndo} />
    </div>
  )
}