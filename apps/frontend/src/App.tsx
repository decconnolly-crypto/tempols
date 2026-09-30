import { useState, useEffect, useCallback } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import type { TempoTask } from '@tempols/core'
import type {
  AppTask,
  Horizon,
  Habit,
  Milestone,
  Commitment,
  Recipe,
} from './types'
import { formatDateStr } from './utils/date'

import { BottomNav } from './components/BottomNav'
import { QuickCaptureModal } from './modals/QuickCaptureModal'
import { NewHorizonModal } from './modals/NewHorizonModal'
import { NewHabitModal } from './modals/NewHabitModal'
import { NewMilestoneModal } from './modals/NewMilestoneModal'
import { NewCommitmentModal } from './modals/NewCommitmentModal'
import { QuarterPlannerModal } from './modals/QuarterPlannerModal'
import { RecipeFormModal } from './modals/RecipeFormModal'
import { RecipePickerModal } from './modals/RecipePickerModal'
import { MealPlannerModal } from './modals/MealPlannerModal'
import { AddRecipeFromUrlModal } from './modals/AddRecipeFromUrlModal'
import { RecipeDetailSheet } from './components/RecipeDetailSheet'
import { MilestoneDetailSheet } from './components/MilestoneDetailSheet'
import { WeeklyCommitmentsSheet } from './components/WeeklyCommitmentsSheet'
import { ShoppingListSheet } from './components/ShoppingListSheet'
import { TaskTriageModal } from './components/TaskTriageModal'
import { UndoToast, type UndoToastPayload } from './components/UndoToast'

import { TodayView } from './views/TodayView'
import { HorizonsView } from './views/HorizonsView'
import { HabitsView } from './views/HabitsView'
import { MealsView } from './views/MealsView'
import { RecipesView } from './views/RecipesView'
import { ActiveFocusView } from './views/ActiveFocusView'
import { TaskBreakdownModal } from './modals/TaskBreakdownModal'
import { DailyPlannerModal } from './modals/DailyPlannerModal'

type Phase = 'MORNING' | 'AFTERNOON' | 'EVENING'

interface MealAssignment {
  date: string
  recipeId: string | null
  reason: string
}

function initialPhase(): Phase {
  const h = new Date().getHours()
  if (h < 12) return 'MORNING'
  if (h < 17) return 'AFTERNOON'
  return 'EVENING'
}

function mondayOfToday(): string {
  const d = new Date()
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function App() {
  const [tasks, setTasks] = useState<AppTask[]>([])
  const [horizons, setHorizons] = useState<Horizon[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [currentDateStr, setCurrentDateStr] = useState<string>(
    formatDateStr(new Date())
  )
  const [selectedPhase, setSelectedPhase] = useState<Phase>(initialPhase)
  const [isDailyPlannerOpen, setIsDailyPlannerOpen] = useState(false)

  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false)
  const [isNewHorizonOpen, setIsNewHorizonOpen] = useState(false)
  const [isNewHabitOpen, setIsNewHabitOpen] = useState(false)
  const [isNewCommitmentOpen, setIsNewCommitmentOpen] = useState(false)
  const [isTriageOpen, setIsTriageOpen] = useState(false)
  const [isQuarterPlannerOpen, setIsQuarterPlannerOpen] = useState(false)
  const [isWeeklyCommitmentsOpen, setIsWeeklyCommitmentsOpen] = useState(false)
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false)
  const [isMealPlannerOpen, setIsMealPlannerOpen] = useState(false)
  const [isAddFromUrlOpen, setIsAddFromUrlOpen] = useState(false)
  const [breakdownTask, setBreakdownTask] = useState<AppTask | null>(null)
  const [actionTask, setActionTask] = useState<AppTask | null>(null)
  const [actionCommitment, setActionCommitment] = useState<Commitment | null>(
    null
  )
  const [milestoneHorizon, setMilestoneHorizon] = useState<Horizon | null>(null)
  const [detailMilestone, setDetailMilestone] = useState<Milestone | null>(null)
  const [recipeFormOpen, setRecipeFormOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null)
  const [pickerDate, setPickerDate] = useState<string | null>(null)
  const [mealsRefreshKey, setMealsRefreshKey] = useState(0)
  const [mealsWeekStart, setMealsWeekStart] = useState<string>(mondayOfToday)

  const [undoToast, setUndoToast] = useState<UndoToastPayload | null>(null)

  const [, setLocation] = useLocation()

  const showUndo = useCallback((message: string, onUndo: () => void) => {
    setUndoToast({ message, onUndo })
  }, [])

  const dismissUndo = useCallback(() => {
    setUndoToast(null)
  }, [])

  const handleAddPlannerTasks = async (
    suggestedTasks: Array<{
      title: string
      durationMinutes: number
      phase: 'MORNING' | 'AFTERNOON' | 'EVENING'
    }>
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

  const syncState = (data: {
    tasks: AppTask[]
    horizons: Horizon[]
    habits: Habit[]
    commitments?: Commitment[]
  }) => {
    setTasks(data.tasks || [])
    setHorizons(data.horizons || [])
    setHabits(data.habits || [])
    setCommitments(data.commitments || [])
  }

  const fetchForDate = (dateStr: string) => {
    fetch(`/api/feed?date=${dateStr}`)
      .then((res) => res.json())
      .then((data) => {
        syncState(data)
        const fetchedTasks = data.tasks || []

        const todayStr = formatDateStr(new Date())
        const isTodayOrPast = dateStr <= todayStr

        if (isTodayOrPast) {
          const overdue = fetchedTasks.filter(
            (t: AppTask) =>
              !t.isCompleted &&
              !t.habitId &&
              Boolean(t.scheduledDate) &&
              t.scheduledDate! < dateStr
          )
          if (overdue.length > 0) {
            setIsTriageOpen(true)
          }
        }
      })
      .catch((err) => console.error('Error syncing:', err))
  }

  const fetchRecipes = useCallback(() => {
    setRecipesLoading(true)
    fetch('/api/recipes')
      .then((res) => res.json())
      .then((data) => setRecipes(data.recipes || []))
      .catch((err) => console.error('Error loading recipes:', err))
      .finally(() => setRecipesLoading(false))
  }, [])

  useEffect(() => {
    fetchForDate(currentDateStr)
  }, [currentDateStr])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

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

  function goToToday() {
    setCurrentDateStr(formatDateStr(new Date()))
  }

  function toggleTask(id: string) {
    const task = tasks.find((t) => t.id === id)
    const wasCompleted = task?.isCompleted ?? false
    const nextState = !wasCompleted

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: nextState } : t))
    )

    if (navigator.vibrate) navigator.vibrate(10)

    if (nextState) {
      showUndo('Task completed', () => {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, isCompleted: false } : t))
        )
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

    setHabits((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, isCompletedToday: nextState } : h
      )
    )

    if (navigator.vibrate) navigator.vibrate(10)

    if (nextState && habit) {
      showUndo(`${habit.title} done`, () => {
        setHabits((prev) =>
          prev.map((h) =>
            h.id === id ? { ...h, isCompletedToday: false } : h
          )
        )
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

  function addHorizon(data: {
    title: string
    description?: string
    targetTag: string
    horizonType: 'PROJECT' | 'QUARTERLY'
    quarter?: string
    startDate?: string
    targetDate?: string
    keyResults: string[]
  }) {
    fetch('/api/horizons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, scheduledDate: currentDateStr }),
    })
      .then((res) => res.json())
      .then(syncState)
      .catch((err) => console.error('Error creating horizon:', err))
  }

  function addHabit(
    title: string,
    phase: TempoTask['phase'],
    durationMinutes: number
  ) {
    fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        phase,
        durationMinutes,
        scheduledDate: currentDateStr,
      }),
    })
      .then((res) => res.json())
      .then(syncState)
      .catch((err) => console.error('Error creating habit:', err))
  }

  function addMilestone(data: {
    horizonId: string
    title: string
    description?: string
    targetDate: string
  }) {
    fetch('/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, scheduledDate: currentDateStr }),
    })
      .then((res) => res.json())
      .then(syncState)
      .catch((err) => console.error('Error creating milestone:', err))
  }

  function addCommitment(data: {
    title: string
    date: string
    startTime: string
    endTime?: string
    child?: string
    location?: string
    notes?: string
    recurrence: 'NONE' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'
    recurrenceEndDate?: string
  }) {
    fetch('/api/commitments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, scheduledDate: currentDateStr }),
    })
      .then((res) => res.json())
      .then(syncState)
      .catch((err) => console.error('Error creating commitment:', err))
  }

  function toggleMilestone(milestoneId: string) {
    setHorizons((prev) =>
      prev.map((h) => ({
        ...h,
        milestones: h.milestones.map((m) =>
          m.id === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m
        ),
      }))
    )

    if (navigator.vibrate) navigator.vibrate(10)

    const currentMilestone = horizons
      .flatMap((h) => h.milestones)
      .find((m) => m.id === milestoneId)

    fetch(`/api/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isCompleted: !currentMilestone?.isCompleted,
        scheduledDate: currentDateStr,
      }),
    })
      .then((res) => res.json())
      .then(syncState)
      .catch((err) => console.error('Error toggling milestone:', err))
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
    fetch(`/api/tasks/${taskId}`, { method: 'DELETE' }).then(() =>
      fetchForDate(currentDateStr)
    )
  }

  const handleDeleteTask = (taskId: string) => {
    fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      .then(() => {
        setActionTask(null)
        fetchForDate(currentDateStr)
      })
      .catch((err) => console.error('Error deleting task:', err))
  }

  const handleDeleteCommitment = (commitmentId: string) => {
    fetch(`/api/commitments/${commitmentId}`, { method: 'DELETE' })
      .then(() => {
        setActionCommitment(null)
        fetchForDate(currentDateStr)
      })
      .catch((err) => console.error('Error deleting commitment:', err))
  }

  const handleReschedule = (taskId: string, offsetDays: number) => {
    const [year, month, day] = currentDateStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    d.setDate(d.getDate() + offsetDays)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const newDate = `${yyyy}-${mm}-${dd}`

    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledDate: newDate }),
    }).then(() => fetchForDate(currentDateStr))
  }

  const handleAssignRecipe = (date: string, recipeId: string) => {
    fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, recipeId }),
    })
      .then(() => setMealsRefreshKey((k) => k + 1))
      .catch((err) => console.error('Error assigning recipe:', err))
  }

  const handleSetMealNote = (date: string, notes: string) => {
    fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, notes }),
    })
      .then(() => setMealsRefreshKey((k) => k + 1))
      .catch((err) => console.error('Error setting meal note:', err))
  }

  const handleClearMeal = (date: string) => {
    fetch(`/api/meals?start=${date}&end=${date}`)
      .then((res) => res.json())
      .then((data) => {
        const meal = data.meals?.[0]
        if (meal) {
          return fetch(`/api/meals/${meal.id}`, { method: 'DELETE' })
        }
      })
      .then(() => setMealsRefreshKey((k) => k + 1))
      .catch((err) => console.error('Error clearing meal:', err))
  }

  const handleCommitMealPlan = async (assignments: MealAssignment[]) => {
    const promises = assignments
      .filter((a) => a.recipeId)
      .map((a) =>
        fetch('/api/meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: a.date, recipeId: a.recipeId }),
        })
      )

    await Promise.all(promises)
    setMealsRefreshKey((k) => k + 1)
  }

  const handleSaveRecipe = (data: {
    title: string
    category: string
    cookTime: number
    ingredients: Array<{ name: string; quantity?: string; unit?: string }>
    instructions: Array<{ title?: string; text: string }>
    tags: string[]
    notes?: string
  }) => {
    const url = editingRecipe
      ? `/api/recipes/${editingRecipe.id}`
      : '/api/recipes'
    const method = editingRecipe ? 'PATCH' : 'POST'

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(() => {
        fetchRecipes()
        setRecipeFormOpen(false)
        setEditingRecipe(null)
      })
      .catch((err) => console.error('Error saving recipe:', err))
  }

  const handleSaveFetchedRecipe = (data: {
    title: string
    category: string
    cookTime: number
    ingredients: string[]
    instructions: Array<{ title?: string; text: string }>
    tags: string[]
    sourceUrl?: string
    sourceName?: string
  }) => {
    return fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((result) => {
        fetchRecipes()
        setIsAddFromUrlOpen(false)
        return result
      })
  }

  const handleDeleteRecipe = (id: string) => {
    fetch(`/api/recipes/${id}`, { method: 'DELETE' })
      .then(() => {
        fetchRecipes()
        setRecipeFormOpen(false)
        setEditingRecipe(null)
      })
      .catch((err) => console.error('Error deleting recipe:', err))
  }

  const coreTasks = tasks.filter((t) => !t.habitId)

  const mealsWeekEnd = (() => {
    const [y, m, d] = mealsWeekStart.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    date.setDate(date.getDate() + 6)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })()

  const overdueTasks = coreTasks.filter(
    (t) =>
      !t.isCompleted &&
      Boolean(t.scheduledDate) &&
      t.scheduledDate! < currentDateStr
  )

  return (
    <div className="min-h-screen text-black font-sans p-5 pb-32 bg-gradient-to-b from-[#F4F1EC] via-[#EEEBF5] to-[#E8EEF4] bg-fixed">
      <div className="max-w-md mx-auto relative h-full">
        <Switch>
          <Route
            path="/"
            component={() => (
              <TodayView
                tasks={coreTasks}
                habits={habits}
                horizons={horizons}
                commitments={commitments}
                toggleTask={toggleTask}
                toggleHabit={toggleHabit}
                currentDateStr={currentDateStr}
                onChangeDate={changeDate}
                onGoToToday={goToToday}
                onOpenPlanner={() => setIsDailyPlannerOpen(true)}
                onOpenTaskActions={(t) => setActionTask(t)}
                onOpenCommitmentCreate={() => setIsNewCommitmentOpen(true)}
                onOpenWeeklyView={() => setIsWeeklyCommitmentsOpen(true)}
                onCommitmentClick={(c) => setActionCommitment(c)}
                selectedPhase={selectedPhase}
                onSelectPhase={setSelectedPhase}
              />
            )}
          />
          <Route
            path="/horizons"
            component={() => (
              <HorizonsView
                horizons={horizons}
                onOpenCreate={() => setIsNewHorizonOpen(true)}
                onOpenAIPlanner={() => setIsQuarterPlannerOpen(true)}
                onOpenMilestoneCreate={(h) => setMilestoneHorizon(h)}
                onToggleMilestone={toggleMilestone}
                onMilestoneClick={(m) => setDetailMilestone(m)}
              />
            )}
          />
          <Route
            path="/habits"
            component={() => (
              <HabitsView
                habits={habits}
                onToggleHabit={toggleHabit}
                onOpenCreate={() => setIsNewHabitOpen(true)}
              />
            )}
          />
          <Route
            path="/meals"
            component={() => (
              <MealsView
                onOpenRecipePicker={(date) => setPickerDate(date)}
                onOpenRecipeLibrary={() => setLocation('/recipes')}
                onOpenShoppingList={() => setIsShoppingListOpen(true)}
                onOpenAIPlanner={() => setIsMealPlannerOpen(true)}
                refreshKey={mealsRefreshKey}
                weekStart={mealsWeekStart}
                onWeekChange={setMealsWeekStart}
              />
            )}
          />
          <Route
            path="/recipes"
            component={() => (
              <RecipesView
                recipes={recipes}
                loading={recipesLoading}
                onNewRecipe={() => {
                  setEditingRecipe(null)
                  setRecipeFormOpen(true)
                }}
                onEditRecipe={(r) => {
                  setEditingRecipe(r)
                  setRecipeFormOpen(true)
                }}
                onViewRecipe={(r) => setDetailRecipe(r)}
                onAddFromUrl={() => setIsAddFromUrlOpen(true)}
              />
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

      <NewMilestoneModal
        isOpen={Boolean(milestoneHorizon)}
        horizon={milestoneHorizon}
        onClose={() => setMilestoneHorizon(null)}
        onSave={addMilestone}
      />

      <NewCommitmentModal
        isOpen={isNewCommitmentOpen}
        onClose={() => setIsNewCommitmentOpen(false)}
        currentDateStr={currentDateStr}
        onSave={addCommitment}
      />

      <QuarterPlannerModal
        isOpen={isQuarterPlannerOpen}
        onClose={() => setIsQuarterPlannerOpen(false)}
        currentDateStr={currentDateStr}
        onCommitted={() => {
          fetchForDate(currentDateStr)
          setLocation('/horizons')
        }}
      />

      <WeeklyCommitmentsSheet
        isOpen={isWeeklyCommitmentsOpen}
        initialWeekStart={currentDateStr}
        onClose={() => setIsWeeklyCommitmentsOpen(false)}
        onCommitmentClick={(c) => setActionCommitment(c)}
        onAddCommitment={() => setIsNewCommitmentOpen(true)}
      />

      <ShoppingListSheet
        isOpen={isShoppingListOpen}
        weekStart={mealsWeekStart}
        weekEnd={mealsWeekEnd}
        onClose={() => setIsShoppingListOpen(false)}
      />

      <MealPlannerModal
        isOpen={isMealPlannerOpen}
        weekStart={mealsWeekStart}
        recipes={recipes}
        onClose={() => setIsMealPlannerOpen(false)}
        onCommit={handleCommitMealPlan}
      />

      <MilestoneDetailSheet
        milestone={detailMilestone}
        onClose={() => setDetailMilestone(null)}
        onToggleTask={(taskId) => {
          toggleTask(taskId)
          setDetailMilestone((prev) => {
            if (!prev) return prev
            const updatedTasks = prev.tasks.map((t) =>
              t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
            )
            return {
              ...prev,
              tasks: updatedTasks,
              completedTaskCount: updatedTasks.filter((t) => t.isCompleted)
                .length,
            }
          })
        }}
        onToggleMilestone={(milestoneId) => {
          toggleMilestone(milestoneId)
          setDetailMilestone((prev) =>
            prev ? { ...prev, isCompleted: !prev.isCompleted } : prev
          )
        }}
        onDelete={(milestoneId) => {
          fetch(`/api/milestones/${milestoneId}`, { method: 'DELETE' })
            .then(() => fetchForDate(currentDateStr))
            .catch((err) => console.error('Error deleting milestone:', err))
        }}
      />

      <RecipeDetailSheet
        recipe={detailRecipe}
        onClose={() => setDetailRecipe(null)}
        onEdit={(r) => {
          setEditingRecipe(r)
          setRecipeFormOpen(true)
        }}
      />

      <AddRecipeFromUrlModal
        isOpen={isAddFromUrlOpen}
        onClose={() => setIsAddFromUrlOpen(false)}
        onSave={handleSaveFetchedRecipe}
      />

      <RecipePickerModal
        isOpen={Boolean(pickerDate)}
        date={pickerDate}
        recipes={recipes}
        onClose={() => setPickerDate(null)}
        onAssignRecipe={handleAssignRecipe}
        onSetNote={handleSetMealNote}
        onClearDay={handleClearMeal}
        onOpenLibrary={() => {
          setPickerDate(null)
          setLocation('/recipes')
        }}
      />

      <RecipeFormModal
        isOpen={recipeFormOpen}
        recipe={editingRecipe}
        onClose={() => {
          setRecipeFormOpen(false)
          setEditingRecipe(null)
        }}
        onSave={handleSaveRecipe}
        onDelete={handleDeleteRecipe}
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
        currentDateStr={currentDateStr}
        existingTasks={tasks}
        commitments={commitments}
        habits={habits}
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
            <h3 className="text-base font-medium text-black mb-1 truncate">
              {actionTask.title}
            </h3>
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
                  handleReschedule(actionTask.id, 1)
                  setActionTask(null)
                }}
                className="w-full bg-gray-100 text-black text-[13px] font-semibold py-3.5 rounded-full active:scale-[0.98] transition-transform"
              >
                Move to tomorrow
              </button>

              <button
                type="button"
                onClick={() => {
                  handleReschedule(actionTask.id, 7)
                  setActionTask(null)
                }}
                className="w-full bg-gray-100 text-black text-[13px] font-semibold py-3.5 rounded-full active:scale-[0.98] transition-transform"
              >
                Move to next week
              </button>

              <button
                type="button"
                onClick={() => {
                  handleMoveToBacklog(actionTask.id)
                  setActionTask(null)
                }}
                className="w-full bg-gray-100 text-black text-[13px] font-semibold py-3.5 rounded-full active:scale-[0.98] transition-transform"
              >
                Move to backlog
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
                onClick={() => handleDeleteTask(actionTask.id)}
                className="w-full bg-rose-50 text-rose-600 text-[13px] font-semibold py-3.5 rounded-full active:scale-[0.98] transition-transform hover:bg-rose-100"
              >
                Delete task
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

      {actionCommitment && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setActionCommitment(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-t-[2rem] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 bg-black/15 rounded-full" />
            </div>
            <h3 className="text-base font-medium text-black mb-1 truncate">
              {actionCommitment.title}
            </h3>
            <p className="text-[12px] text-black/50 mb-5">
              {actionCommitment.startTime}
              {actionCommitment.child && ` · ${actionCommitment.child}`}
              {actionCommitment.isRecurring && ' · Recurring'}
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDeleteCommitment(actionCommitment.id)}
                className="w-full bg-rose-50 text-rose-600 text-[13px] font-semibold py-3.5 rounded-full active:scale-[0.98] transition-transform hover:bg-rose-100"
              >
                {actionCommitment.isRecurring
                  ? 'Delete all occurrences'
                  : 'Delete'}
              </button>

              <button
                type="button"
                onClick={() => setActionCommitment(null)}
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