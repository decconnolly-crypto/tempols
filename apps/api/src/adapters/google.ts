import type { ProviderAdapter, ExternalTask } from './types'

export class GoogleCalendarAdapter implements ProviderAdapter {
  name = 'GOOGLE'

  async fetchTasksForDate(dateStr: string): Promise<ExternalTask[]> {
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    // Fallback simulated fetch if API keys aren't set in .env yet
    if (!apiKey || !calendarId) {
      return [
        {
          externalId: `gcal-${dateStr}-design-sync`,
          title: 'Sync with Design Team',
          description: 'Review the new Horizons mockups.',
          phase: 'AFTERNOON',
          durationMinutes: 45,
          scheduledDate: dateStr,
          tags: ['agency', 'meeting'],
          provider: 'GOOGLE'
        }
      ]
    }

    try {
      const timeMin = new Date(`${dateStr}T00:00:00Z`).toISOString()
      const timeMax = new Date(`${dateStr}T23:59:59Z`).toISOString()

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&key=${apiKey}`
      )
      const data = await res.json()

      return (data.items || []).map((event: any) => {
        const start = new Date(event.start?.dateTime || event.start?.date)
        const hour = start.getHours()
        
        let phase: 'MORNING' | 'AFTERNOON' | 'EVENING' = 'AFTERNOON'
        if (hour < 12) phase = 'MORNING'
        else if (hour >= 17) phase = 'EVENING'

        return {
          externalId: `gcal-${event.id}`,
          title: event.summary || 'Calendar Event',
          description: event.description || '',
          phase,
          durationMinutes: 30,
          scheduledDate: dateStr,
          tags: ['calendar', 'meeting'],
          provider: 'GOOGLE'
        }
      })
    } catch (err) {
      console.error('Google Calendar adapter error:', err)
      return []
    }
  }
}