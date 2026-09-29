export interface ExternalTask {
    externalId: string
    title: string
    description?: string
    phase: 'MORNING' | 'AFTERNOON' | 'EVENING'
    durationMinutes: number
    scheduledDate: string
    tags: string[]
    provider: 'GOOGLE' | 'KANEO'
  }
  
  export interface ProviderAdapter {
    name: string
    fetchTasksForDate(dateStr: string): Promise<ExternalTask[]>
  }