import type { TempoTask } from '@tempols/core'

export type AppTask = TempoTask & {
  description?: string
  horizonId?: string
  habitId?: string
  scheduledDate?: string
}

export type Horizon = {
  id: string
  title: string
  targetTag: string
  progress: number
  totalTasks: number
  completedTasks: number
}

export type Habit = {
  id: string
  title: string
  phase: TempoTask['phase']
  streak: number
  durationMinutes: number
  isCompletedToday: boolean
}