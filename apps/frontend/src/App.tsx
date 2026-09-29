import { useState, useEffect } from 'react'
import { Route, Switch } from 'wouter'
import type { TempoTask } from '@tempols/core'
import type { AppTask, Horizon, Habit } from './types'
import { formatDateStr } from './utils/date'

import { BottomNav } from './components/BottomNav'
import { QuickCaptureModal } from "./modals/QuickCaptureModal";
import { NewHorizonModal } from './modals/NewHorizonModal'
import { NewHabitModal } from './modals/NewHabitModal'
import { TaskTriageModal } from './components/TaskTriageModal'

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

  const handleAddPlannerTasks = async (
    suggestedTasks: Array<{ title: string; durationMinutes: number; phase: 'MORNING' | 'AFTERNOON' | 'EVENING' }>
  ) => {
    try {
      const createdTasks = await Promise.all(
        suggestedTasks.map((t) =>
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: t.title,
              durationMinutes: t.durationMinutes || 30,
              phase: t.phase || 'MORNING',
              dateStr: currentDateStr,
            }),
          }).then((res) => res.json())
        )
      )
  
      setTasks((prev) => [...prev, ...createdTasks])
    } catch (err) {
      console.error('Failed to import AI tasks:', err)
    }
  }

  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false)
  const [isNewHorizonOpen, setIsNewHorizonOpen] = useState(false)
  const [isNewHabitOpen, setIsNewHabitOpen] = useState(false)
  const [isTriageOpen, setIsTriageOpen] = useState(false)
  const [breakdownTask, setBreakdownTask] = useState<AppTask | null>(null)

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
        // Trigger Triage ONLY for uncompleted tasks from the past (ignoring habits)
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
    // Optimistic UI update: Check the box instantly
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)))
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
    // Optimistic UI update: Check the box instantly
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, isCompletedToday: !h.isCompletedToday } : h)))
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
      .then((res) => res.json())
      .then(syncState)
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
    fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      .then(() => fetchForDate(currentDateStr))
  }

  // Filter out habit-clones from the progress bar task list
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
                habits={habits} /* FIX: Habits are explicitly passed back in! */
                horizons={horizons} /* FIX: Horizons explicitly passed back in! */
                toggleTask={toggleTask}
                toggleHabit={toggleHabit} /* FIX: Habit toggles enabled again! */
                currentDateStr={currentDateStr}
                onChangeDate={changeDate}
                onOpenPlanner={() => setIsDailyPlannerOpen(true)}
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
            component={() => <ActiveFocusView tasks={coreTasks} toggleTask={toggleTask} onOpenBreakdown={(t) => setBreakdownTask(t)} />}          />
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
    </div>
  )
}