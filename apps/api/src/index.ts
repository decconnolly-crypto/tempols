import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma } from './db'
import { syncExternalProviders } from './services/syncService'

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Hono()

app.use('/*', cors())

function getTodayStr(date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getPhaseFromTime(date: Date): 'MORNING' | 'AFTERNOON' | 'EVENING' {
  const hour = date.getHours()
  if (hour < 12) return 'MORNING'
  if (hour < 17) return 'AFTERNOON'
  return 'EVENING'
}

function safeParseTags(tagsJson: string): string[] {
  try {
    return JSON.parse(tagsJson)
  } catch {
    return []
  }
}

async function evaluateHabitResets() {
  const todayStr = getTodayStr()
  
  await prisma.habit.updateMany({
    where: {
      lastCompletedDate: {
        not: todayStr
      }
    },
    data: {
      isCompletedToday: false
    }
  })
}

async function ensureHabitsForDate(targetDate: string) {
  const habits = await prisma.habit.findMany()

  for (const hb of habits) {
    const existing = await prisma.task.findFirst({
      where: {
        habitId: hb.id,
        scheduledDate: targetDate
      }
    })

    if (!existing) {
      await prisma.task.create({
        data: {
          title: hb.title,
          phase: hb.phase,
          durationMinutes: hb.durationMinutes,
          isCompleted: false,
          provider: 'MANUAL',
          tags: JSON.stringify(['habit']),
          habitId: hb.id,
          scheduledDate: targetDate
        }
      })
    }
  }
}

async function getUnifiedData(selectedDateStr?: string) {
  await evaluateHabitResets()
  const targetDate = selectedDateStr || getTodayStr()

  // Pull external entries from Google Calendar and Kaneo
  await syncExternalProviders(targetDate)
  await ensureHabitsForDate(targetDate)

  // Fetch today's tasks AND past uncompleted tasks
  const rawTasks = await prisma.task.findMany({
    where: {
      OR: [
        { scheduledDate: targetDate },
        { 
          scheduledDate: { lt: targetDate },
          isCompleted: false 
        }
      ]
    }
  })

  const tasks = rawTasks.map(t => ({
    ...t,
    tags: safeParseTags(t.tags)
  }))

  const allTasks = await prisma.task.findMany()
  const horizons = await prisma.horizon.findMany()

  const enrichedHorizons = horizons.map(h => {
    const linkedTasks = allTasks.filter(t => {
      const parsedTags = safeParseTags(t.tags)
      return t.horizonId === h.id || parsedTags.includes(h.targetTag)
    })
    const total = linkedTasks.length
    const completed = linkedTasks.filter(t => t.isCompleted).length
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

    return {
      ...h,
      totalTasks: total,
      completedTasks: completed,
      progress
    }
  })

  const habits = await prisma.habit.findMany()

  return {
    selectedDate: targetDate,
    tasks,
    horizons: enrichedHorizons,
    habits
  }
}

// ==========================================
// API ROUTES
// ==========================================

app.get('/api/feed', async (c) => {
  const dateQuery = c.req.query('date')
  const data = await getUnifiedData(dateQuery)
  return c.json(data)
})

app.post('/api/horizons', async (c) => {
  const body = await c.req.json()
  await prisma.horizon.create({
    data: {
      title: body.title || 'New Horizon',
      targetTag: (body.targetTag || 'general').toLowerCase()
    }
  })
  const data = await getUnifiedData(body.scheduledDate)
  return c.json({ success: true, ...data })
})

app.post('/api/habits', async (c) => {
  const body = await c.req.json()
  const todayStr = getTodayStr()
  const targetDate = body.scheduledDate || todayStr

  const newHabit = await prisma.habit.create({
    data: {
      title: body.title || 'New Habit',
      phase: body.phase || 'MORNING',
      streak: 0,
      durationMinutes: body.durationMinutes || 20,
      isCompletedToday: false,
      lastCompletedDate: null
    }
  })

  await prisma.task.create({
    data: {
      title: newHabit.title,
      phase: newHabit.phase,
      durationMinutes: newHabit.durationMinutes,
      isCompleted: false,
      provider: 'MANUAL',
      tags: JSON.stringify(['habit']),
      habitId: newHabit.id,
      scheduledDate: targetDate
    }
  })

  const data = await getUnifiedData(targetDate)
  return c.json({ success: true, ...data })
})

app.post('/api/habits/:id/toggle', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const todayStr = getTodayStr()
  const targetDate = body.scheduledDate || todayStr

  const habit = await prisma.habit.findUnique({ where: { id } })

  if (habit) {
    const nextState = !habit.isCompletedToday

    await prisma.task.updateMany({
      where: { habitId: id, scheduledDate: targetDate },
      data: { isCompleted: nextState }
    })

    await prisma.habit.update({
      where: { id },
      data: {
        isCompletedToday: targetDate === todayStr ? nextState : habit.isCompletedToday,
        streak: nextState ? habit.streak + 1 : Math.max(0, habit.streak - 1),
        lastCompletedDate: nextState ? todayStr : null
      }
    })
  }

  const data = await getUnifiedData(targetDate)
  return c.json({ success: true, ...data })
})

app.post('/api/tasks/:id/toggle', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const todayStr = getTodayStr()
  const targetDate = body.scheduledDate || todayStr

  const task = await prisma.task.findUnique({ where: { id } })

  if (task) {
    const nextState = !task.isCompleted

    await prisma.task.update({
      where: { id },
      data: { isCompleted: nextState }
    })

    if (task.habitId) {
      const habit = await prisma.habit.findUnique({ where: { id: task.habitId } })
      if (habit) {
        await prisma.habit.update({
          where: { id: task.habitId },
          data: {
            isCompletedToday: targetDate === todayStr ? nextState : habit.isCompletedToday,
            streak: nextState ? habit.streak + 1 : Math.max(0, habit.streak - 1),
            lastCompletedDate: nextState ? todayStr : null
          }
        })
      }
    }
  }

  const data = await getUnifiedData(targetDate)
  return c.json({ success: true, ...data })
})

app.post('/api/tasks', async (c) => {
  const body = await c.req.json()
  const now = new Date()
  const targetDate = body.scheduledDate || getTodayStr()

  await prisma.task.create({
    data: {
      title: body.title || 'Untitled Task',
      description: body.description || null,
      phase: body.phase || getPhaseFromTime(now),
      durationMinutes: body.durationMinutes || 30,
      isCompleted: false,
      provider: 'MANUAL',
      tags: JSON.stringify(body.tags || []),
      horizonId: body.horizonId || null,
      habitId: body.habitId || null,
      scheduledDate: targetDate
    }
  })

  const data = await getUnifiedData(targetDate)
  return c.json({ success: true, ...data })
})

app.patch('/api/tasks/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  
  const updateData: any = {}
  if (body.scheduledDate !== undefined) {
    updateData.scheduledDate = body.scheduledDate
  }
  if (body.isCompleted !== undefined) {
    updateData.isCompleted = body.isCompleted
  }

  await prisma.task.update({
    where: { id },
    data: updateData
  })
  
  return c.json({ success: true })
})

app.delete('/api/tasks/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.task.delete({ where: { id } })
  return c.json({ success: true })
})

app.post('/api/ai/decompose', async (c) => {
  const { title } = await c.req.json().catch(() => ({ title: '' }))

  if (!title) {
    return c.json({ error: 'Title is required' }, 400)
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return c.json({
      subtasks: [
        `Outline core requirements for "${title}"`,
        `Set up initial design/dev structure`,
        `Draft core logic & implementation`,
        `Review and finalize`
      ]
    })
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Break down the task "${title}" into 3 to 5 concise, actionable sub-tasks. Return ONLY a valid JSON array of strings, e.g. ["Step 1", "Step 2", "Step 3"]. Do not include codeblock markers or extra words.`
                }
              ]
            }
          ]
        })
      }
    )

    const data = await response.json()

    if (data.error) {
      console.error('--- GEMINI REJECTED KEY OR MODEL ---')
      console.error('Error Code:', data.error.code)
      console.error('Error Message:', data.error.message)
      console.error('-------------------------------------')
      throw new Error(data.error.message)
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleanText = rawText.replace(/```json|```/g, '').trim()
    
    let subtasks: string[] = []
    try {
      subtasks = JSON.parse(cleanText)
    } catch {
      subtasks = cleanText
        .split('\n')
        .map((s: string) => s.replace(/^[-*\d.]+\s*/, '').trim())
        .filter(Boolean)
    }

    return c.json({ subtasks })
  } catch (err) {
    console.error('AI Decomposition Error:', err)
    return c.json({
      subtasks: [
        `Prepare agenda for "${title}"`,
        `Gather key stakeholders and materials`,
        `Execute primary action item`,
        `Document outcomes and follow-ups`
      ]
    })
  }
})

app.post('/api/ai/daily-plan', async (c) => {
  const { messages, existingTasks = [] } = await c.req.json().catch(() => ({ messages: [], existingTasks: [] }))

  if (!messages || !Array.isArray(messages)) {
    return c.json({ error: 'Messages array is required' }, 400)
  }

  const currentLoads = { MORNING: 0, AFTERNOON: 0, EVENING: 0 }
  existingTasks.forEach((t: { phase?: 'MORNING' | 'AFTERNOON' | 'EVENING'; durationMinutes?: number; isCompleted?: boolean }) => {
    if (!t.isCompleted && t.phase && currentLoads[t.phase] !== undefined) {
      currentLoads[t.phase] += t.durationMinutes || 30
    }
  })

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return c.json({
      reply: "I'm ready to help plan your day! Tell me what's on your mind.",
      suggestedTasks: []
    })
  }

  try {
    const systemPrompt = `You are an executive daily planning coach for a minimalist Life OS.
Your job is to parse what the user needs to do today and schedule tasks into the optimal phase of the day.

PHASE CAPACITY RULES:
- MORNING capacity: 180 mins total. Current used: ${currentLoads.MORNING} mins.
- AFTERNOON capacity: 180 mins total. Current used: ${currentLoads.AFTERNOON} mins.
- EVENING capacity: 90 mins total. Current used: ${currentLoads.EVENING} mins.

STRICT SCHEDULING CONSTRAINTS:
1. Work / professional / focus-heavy tasks MUST ONLY go into MORNING or AFTERNOON. Never EVENING.
2. Personal, relaxing, or lightweight end-of-day tasks can go into EVENING or any phase with room.
3. Automatically pick the next available phase that has enough remaining minute capacity.

Return ONLY a valid JSON object matching this structure:
{
  "reply": "1-2 sentence supportive or clarifying response.",
  "suggestedTasks": [
    {
      "title": "Task title",
      "durationMinutes": 30,
      "phase": "MORNING" | "AFTERNOON" | "EVENING"
    }
  ]
}`

    const contents = [
      { parts: [{ text: systemPrompt }] },
      ...messages.map((m: { role: string; text: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }))
    ]

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    )

    const data = await response.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const cleanText = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleanText)

    return c.json({
      reply: parsed.reply || "What else do you need to get done today?",
      suggestedTasks: Array.isArray(parsed.suggestedTasks) ? parsed.suggestedTasks : []
    })
  } catch (err) {
    console.error('Daily Plan AI Error:', err)
    return c.json({
      reply: "Tell me what you'd like to achieve today, and I'll structure it into your schedule.",
      suggestedTasks: []
    })
  }
})

// ==========================================
// PRODUCTION FRONTEND STATIC SERVING
// ==========================================

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../../frontend/dist')

  // Serve static JS/CSS/asset files
  app.use('/*', serveStatic({ root: distPath }))

  // Catch-all fallback to index.html for SPA routing
  app.get('*', serveStatic({ path: `${distPath}/index.html` }))
}

serve({ fetch: app.fetch, port: 3002 }, (info) => {
  console.log(`API running with SQLite persistence and provider sync on http://localhost:${info.port}`)
})