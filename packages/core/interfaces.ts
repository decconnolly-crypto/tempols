export interface TempoTask {
  id: string
  title: string
  phase: 'MORNING' | 'AFTERNOON' | 'EVENING'
  durationMinutes: number
  isCompleted: boolean
  provider: 'KANEO' | 'MANUAL'
  tags: string[]
}

export interface TempoEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  provider: 'GOOGLE' | 'FAMILY'
}
