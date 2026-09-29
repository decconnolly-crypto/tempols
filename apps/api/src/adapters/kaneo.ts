import type { ProviderAdapter, ExternalTask } from './types'

export class KaneoAdapter implements ProviderAdapter {
  name = 'KANEO'

  async fetchTasksForDate(dateStr: string): Promise<ExternalTask[]> {
    const kaneoUrl = process.env.KANEO_API_URL
    const kaneoApiKey = process.env.KANEO_API_KEY

    if (!kaneoUrl || !kaneoApiKey) {
      return [
        {
          externalId: `kaneo-${dateStr}-hono-structure`,
          title: 'Finalize Hono API structure',
          description: 'Ensure all provider routes handle error bounds.',
          phase: 'AFTERNOON',
          durationMinutes: 90,
          scheduledDate: dateStr,
          tags: ['agency', 'dev'],
          provider: 'KANEO'
        }
      ]
    }

    try {
      const res = await fetch(`${kaneoUrl}/api/v1/tasks?dueDate=${dateStr}`, {
        headers: { Authorization: `Bearer ${kaneoApiKey}` }
      })
      const data = await res.json()

      return (data.tasks || []).map((card: any) => ({
        externalId: `kaneo-${card.id}`,
        title: card.title,
        description: card.description || '',
        phase: 'AFTERNOON',
        durationMinutes: card.estimatedMinutes || 60,
        scheduledDate: dateStr,
        tags: card.labels || ['kaneo'],
        provider: 'KANEO'
      }))
    } catch (err) {
      console.error('Kaneo adapter error:', err)
      return []
    }
  }
}