import { prisma } from '../db'
import { GoogleCalendarAdapter } from '../adapters/google'
import { KaneoAdapter } from '../adapters/kaneo'

const adapters = [new GoogleCalendarAdapter(), new KaneoAdapter()]

export async function syncExternalProviders(dateStr: string) {
  for (const adapter of adapters) {
    const externalTasks = await adapter.fetchTasksForDate(dateStr)

    for (const ext of externalTasks) {
      const existing = await prisma.task.findFirst({
        where: {
          title: ext.title,
          scheduledDate: dateStr,
          provider: ext.provider
        }
      })

      if (!existing) {
        await prisma.task.create({
          data: {
            title: ext.title,
            description: ext.description || null,
            phase: ext.phase,
            durationMinutes: ext.durationMinutes,
            isCompleted: false,
            provider: ext.provider,
            tags: JSON.stringify(ext.tags),
            scheduledDate: dateStr
          }
        })
      }
    }
  }
}