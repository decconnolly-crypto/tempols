import type { TempoTask } from '@tempols/core'

export type AppTask = TempoTask & {
  description?: string
  horizonId?: string
  milestoneId?: string
  habitId?: string
  scheduledDate?: string
}

export type MilestoneTask = {
  id: string
  title: string
  description?: string | null
  phase: string
  durationMinutes: number
  isCompleted: boolean
  scheduledDate: string
  provider: string
  horizonId?: string | null
  milestoneId?: string | null
  habitId?: string | null
}

export type Milestone = {
  id: string
  horizonId: string
  title: string
  description?: string
  targetDate: string
  weekNumber: number
  isCompleted: boolean
  taskCount: number
  completedTaskCount: number
  tasks: MilestoneTask[]
}

export type Horizon = {
  id: string
  title: string
  description?: string
  targetTag: string
  horizonType: 'PROJECT' | 'QUARTERLY'
  quarter?: string
  startDate?: string
  targetDate?: string
  keyResults: string[]
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  progress: number
  totalTasks: number
  completedTasks: number
  milestones: Milestone[]
  completedMilestones: number
  totalMilestones: number
}

export type Habit = {
  id: string
  title: string
  phase: TempoTask['phase']
  streak: number
  durationMinutes: number
  isCompletedToday: boolean
}

export type Commitment = {
  id: string
  title: string
  occurrenceDate: string
  startTime: string
  endTime: string | null
  child: string | null
  location: string | null
  notes: string | null
  recurrence: 'NONE' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'
  isRecurring: boolean
}