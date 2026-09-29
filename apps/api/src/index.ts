import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma } from './db'
import { syncExternalProviders } from './services/syncService'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Hono()

app.use('/*', cors())

// ==========================================
// HELPERS
// ==========================================

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

function safeParseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

function currentQuarter(): string {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3) + 1
  return `${now.getFullYear()}-Q${q}`
}

// ── Date helpers for commitment recurrence ──

function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr)
  d.setDate(d.getDate() + days)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function diffDays(a: string, b: string): number {
  const da = parseDateStr(a)
  const db = parseDateStr(b)
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Given a commitment and a date range, return the list of date strings
 * on which the commitment occurs within that range.
 */
function expandCommitmentDates(
  commitment: { date: string; recurrence: string; recurrenceEndDate: string | null },
  rangeStart: string,
  rangeEnd: string
): string[] {
  const { date, recurrence, recurrenceEndDate } = commitment
  const results: string[] = []

  const effectiveEnd = recurrenceEndDate && recurrenceEndDate < rangeEnd
    ? recurrenceEndDate
    : rangeEnd

  if (recurrence === 'NONE') {
    if (date >= rangeStart && date <= rangeEnd) {
      results.push(date)
    }
    return results
  }

  if (recurrence === 'WEEKLY') {
    const startDiff = diffDays(date, rangeStart)
    const weeksToAdd = Math.max(0, Math.ceil(startDiff / 7))
    let current = addDays(date, weeksToAdd * 7)
    while (current <= effectiveEnd) {
      if (current >= rangeStart) results.push(current)
      current = addDays(current, 7)
    }
    return results
  }

  if (recurrence === 'FORTNIGHTLY') {
    const startDiff = diffDays(date, rangeStart)
    const fortnightsToAdd = Math.max(0, Math.ceil(startDiff / 14))
    let current = addDays(date, fortnightsToAdd * 14)
    while (current <= effectiveEnd) {
      if (current >= rangeStart) results.push(current)
      current = addDays(current, 14)
    }
    return results
  }

  if (recurrence === 'MONTHLY') {
    const source = parseDateStr(date)
    const rangeStartDate = parseDateStr(rangeStart)
    const rangeEndDate = parseDateStr(rangeEnd)

    let y = rangeStartDate.getFullYear()
    let m = rangeStartDate.getMonth()
    const day = source.getDate()

    while (true) {
      const candidate = new Date(y, m, day)
      // Handle month overflow (e.g. Feb 30 → Mar 2). If month changed, skip.
      if (candidate.getMonth() === (m % 12)) {
        const candidateStr = `${candidate.getFullYear()}-${String(
          candidate.getMonth() + 1
        ).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`
        if (candidateStr > rangeEndDate.toISOString().slice(0, 10)) break
        if (candidateStr >= rangeStart && candidateStr <= effectiveEnd) {
          results.push(candidateStr)
        }
      }
      m += 1
      if (m > 11) {
        m = 0
        y += 1
      }
      if (y > rangeEndDate.getFullYear() + 1) break
    }
    return results
  }

  return results
}

async function getCommitmentsForRange(
  rangeStart: string,
  rangeEnd: string
): Promise<
  Array<{
    id: string
    title: string
    occurrenceDate: string
    startTime: string
    endTime: string | null
    child: string | null
    location: string | null
    notes: string | null
    recurrence: string
    isRecurring: boolean
  }>
> {
  const all = await prisma.commitment.findMany()

  const expanded: Array<{
    id: string
    title: string
    occurrenceDate: string
    startTime: string
    endTime: string | null
    child: string | null
    location: string | null
    notes: string | null
    recurrence: string
    isRecurring: boolean
  }> = []

  for (const c of all) {
    const dates = expandCommitmentDates(
      {
        date: c.date,
        recurrence: c.recurrence,
        recurrenceEndDate: c.recurrenceEndDate,
      },
      rangeStart,
      rangeEnd
    )
    for (const d of dates) {
      expanded.push({
        id: c.id,
        title: c.title,
        occurrenceDate: d,
        startTime: c.startTime,
        endTime: c.endTime,
        child: c.child,
        location: c.location,
        notes: c.notes,
        recurrence: c.recurrence,
        isRecurring: c.recurrence !== 'NONE',
      })
    }
  }

  // Sort by date, then by start time
  expanded.sort((a, b) => {
    if (a.occurrenceDate !== b.occurrenceDate) {
      return a.occurrenceDate.localeCompare(b.occurrenceDate)
    }
    return a.startTime.localeCompare(b.startTime)
  })

  return expanded
}

const QUARTER_INTERVIEW_SYSTEM_PROMPT = `You are a sharp quarterly planning coach for an agency owner who uses a minimalist Life OS.

Today's date is {{TODAY}}. Use this to determine the current quarter. DO NOT use any date from your training data — always derive all dates from today's date.

Your job is NOT to produce a plan immediately. Your job is to gather enough context first, then produce a water-tight plan.

## PHASE 1: INTERROGATION

Ask clarifying questions one at a time. Each question should probe for something that materially changes the plan. Things worth asking about (pick what's relevant, not all):

- Who is doing the work? (solo, contractor, team)
- What is the hard deadline, and why that date?
- What's the budget or resource ceiling?
- What has been tried before that failed, and why?
- What are the real constraints — time per week, other commitments, dependencies on others?
- What does "done" actually look like? (be specific — "site live" vs "site launched and generating leads")
- Which of these outcomes actually matters most? (if the user gave multiple goals)

Ask no more than 5 questions total. Stop asking when you have enough to make a plan that would survive contact with reality. If the user's first message already contains enough context, skip straight to a plan.

## PHASE 2: THE PLAN

When you have enough, produce a structured plan.

Rules for the plan:
- 2-4 key results. Each is measurable and dated, referencing the actual current quarter.
- 5-7 milestones spread across the FULL 13 weeks of the quarter. The first milestone should fall in week 1 or 2. The last in week 12 or 13. Do NOT cluster milestones at the end.
- Each milestone has a target date and a one-line description of what "done" looks like.
- For each milestone, 3-5 concrete tasks. Each task is 30-120 minutes, scheduled on a weekday, and phrased as an action ("Draft homepage copy" not "Homepage").
- Tasks should be spread realistically across the weeks within each milestone.
- Respect the phases: work tasks go in MORNING or AFTERNOON. Only genuinely personal or light tasks go in EVENING.
- If the goal includes a post-launch metric (e.g. "increase leads by 20%"), include at least one milestone AFTER launch dedicated to optimising and measuring that metric. Do not end the plan at the moment of launch.

## OUTPUT FORMAT

You MUST respond with valid JSON only. No prose outside the JSON. No code fences.

When asking a question:
{
  "type": "question",
  "reply": "your question here"
}

When producing a plan:
{
  "type": "plan",
  "reply": "short intro sentence",
  "plan": {
    "horizon": {
      "title": "...",
      "description": "...",
      "targetTag": "one-word-lowercase-tag",
      "quarter": "YYYY-QN",
      "startDate": "YYYY-MM-DD",
      "targetDate": "YYYY-MM-DD",
      "keyResults": ["...", "..."]
    },
    "milestones": [
      { "title": "...", "description": "...", "weekNumber": 1, "targetDate": "YYYY-MM-DD" }
    ],
    "tasks": [
      { "title": "...", "milestoneTitle": "...", "durationMinutes": 60, "phase": "MORNING", "scheduledDate": "YYYY-MM-DD" }
    ]
  }
}`

// ==========================================
// DATA HELPERS
// ==========================================

async function evaluateHabitResets() {
  const todayStr = getTodayStr()

  await prisma.habit.updateMany({
    where: {
      lastCompletedDate: {
        not: todayStr,
      },
    },
    data: {
      isCompletedToday: false,
    },
  })
}

async function ensureHabitsForDate(targetDate: string) {
  const habits = await prisma.habit.findMany()

  for (const hb of habits) {
    const existing = await prisma.task.findFirst({
      where: {
        habitId: hb.id,
        scheduledDate: targetDate,
      },
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
          scheduledDate: targetDate,
        },
      })
    }
  }
}

async function getUnifiedData(selectedDateStr?: string) {
  await evaluateHabitResets()
  const targetDate = selectedDateStr || getTodayStr()

  try {
    await syncExternalProviders(targetDate)
  } catch (err) {
    console.warn('External provider sync warning:', err)
  }

  await ensureHabitsForDate(targetDate)

  const rawTasks = await prisma.task.findMany({
    where: {
      OR: [
        { scheduledDate: targetDate },
        {
          scheduledDate: { lt: targetDate },
          isCompleted: false,
        },
      ],
    },
  })

  const tasks = rawTasks.map((t) => ({
    ...t,
    tags: safeParseTags(t.tags),
  }))

  const allTasks = await prisma.task.findMany()
  const horizons = await prisma.horizon.findMany()
  const milestones = await prisma.milestone.findMany()

  const enrichedHorizons = horizons.map((h) => {
    const linkedTasks = allTasks.filter((t) => {
      const parsedTags = safeParseTags(t.tags)
      return t.horizonId === h.id || parsedTags.includes(h.targetTag)
    })
    const total = linkedTasks.length
    const completed = linkedTasks.filter((t) => t.isCompleted).length
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

    const horizonMilestones = milestones
      .filter((m) => m.horizonId === h.id)
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .map((m) => {
        const milestoneTasks = allTasks
          .filter((t) => t.milestoneId === m.id)
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))

        return {
          ...m,
          taskCount: milestoneTasks.length,
          completedTaskCount: milestoneTasks.filter((t) => t.isCompleted).length,
          tasks: milestoneTasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            phase: t.phase,
            durationMinutes: t.durationMinutes,
            isCompleted: t.isCompleted,
            scheduledDate: t.scheduledDate,
            provider: t.provider,
            horizonId: t.horizonId,
            milestoneId: t.milestoneId,
            habitId: t.habitId,
          })),
        }
      })

    const completedMilestones = horizonMilestones.filter((m) => m.isCompleted).length

    return {
      ...h,
      keyResults: safeParseJson<string[]>(h.keyResults, []),
      totalTasks: total,
      completedTasks: completed,
      progress,
      milestones: horizonMilestones,
      completedMilestones,
      totalMilestones: horizonMilestones.length,
    }
  })

  const habits = await prisma.habit.findMany()
  const commitments = await getCommitmentsForRange(targetDate, targetDate)

  return {
    selectedDate: targetDate,
    tasks,
    horizons: enrichedHorizons,
    habits,
    commitments,
  }
}

// ==========================================
// API ROUTES — FEED
// ==========================================

app.get('/api/feed', async (c) => {
  const dateQuery = c.req.query('date')
  const data = await getUnifiedData(dateQuery)
  return c.json(data)
})

// ==========================================
// API ROUTES — COMMITMENTS
// ==========================================

app.get('/api/commitments/week', async (c) => {
  const start = c.req.query('start') || getTodayStr()
  const end = addDays(start, 6)
  const commitments = await getCommitmentsForRange(start, end)
  return c.json({ start, end, commitments })
})

app.post('/api/commitments', async (c) => {
  const body = await c.req.json()

  if (!body.title || !body.date || !body.startTime) {
    return c.json({ error: 'title, date, startTime required' }, 400)
  }

  await prisma.commitment.create({
    data: {
      title: body.title,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime || null,
      child: body.child || null,
      location: body.location || null,
      notes: body.notes || null,
      recurrence: body.recurrence || 'NONE',
      recurrenceEndDate: body.recurrenceEndDate || null,
    },
  })

  const data = await getUnifiedData(body.scheduledDate || body.date)
  return c.json({ success: true, ...data })
})

app.patch('/api/commitments/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))

  const updateData: Record<string, unknown> = {}
  if (body.title !== undefined) updateData.title = body.title
  if (body.date !== undefined) updateData.date = body.date
  if (body.startTime !== undefined) updateData.startTime = body.startTime
  if (body.endTime !== undefined) updateData.endTime = body.endTime
  if (body.child !== undefined) updateData.child = body.child
  if (body.location !== undefined) updateData.location = body.location
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.recurrence !== undefined) updateData.recurrence = body.recurrence
  if (body.recurrenceEndDate !== undefined)
    updateData.recurrenceEndDate = body.recurrenceEndDate

  await prisma.commitment.update({ where: { id }, data: updateData })

  const data = await getUnifiedData(body.scheduledDate)
  return c.json({ success: true, ...data })
})

app.delete('/api/commitments/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.commitment.delete({ where: { id } })
  return c.json({ success: true })
})

// ==========================================
// API ROUTES — HORIZONS
// ==========================================

app.post('/api/horizons', async (c) => {
  const body = await c.req.json()
  await prisma.horizon.create({
    data: {
      title: body.title || 'New Horizon',
      description: body.description || null,
      targetTag: (body.targetTag || 'general').toLowerCase(),
      horizonType: body.horizonType || 'PROJECT',
      quarter: body.quarter || null,
      startDate: body.startDate || null,
      targetDate: body.targetDate || null,
      keyResults: JSON.stringify(body.keyResults || []),
      status: 'ACTIVE',
    },
  })
  const data = await getUnifiedData(body.scheduledDate)
  return c.json({ success: true, ...data })
})

app.patch('/api/horizons/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))

  const updateData: Record<string, unknown> = {}
  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description
  if (body.targetTag !== undefined)
    updateData.targetTag = String(body.targetTag).toLowerCase()
  if (body.horizonType !== undefined) updateData.horizonType = body.horizonType
  if (body.quarter !== undefined) updateData.quarter = body.quarter
  if (body.startDate !== undefined) updateData.startDate = body.startDate
  if (body.targetDate !== undefined) updateData.targetDate = body.targetDate
  if (body.status !== undefined) updateData.status = body.status
  if (body.keyResults !== undefined)
    updateData.keyResults = JSON.stringify(body.keyResults)

  await prisma.horizon.update({ where: { id }, data: updateData })

  const data = await getUnifiedData(body.scheduledDate)
  return c.json({ success: true, ...data })
})

app.delete('/api/horizons/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.horizon.delete({ where: { id } })
  return c.json({ success: true })
})

// ==========================================
// API ROUTES — MILESTONES
// ==========================================

app.post('/api/milestones', async (c) => {
  const body = await c.req.json()

  if (!body.horizonId || !body.title || !body.targetDate) {
    return c.json({ error: 'horizonId, title, targetDate required' }, 400)
  }

  let weekNumber = body.weekNumber
  if (!weekNumber) {
    const horizon = await prisma.horizon.findUnique({ where: { id: body.horizonId } })
    if (horizon?.startDate) {
      const start = new Date(horizon.startDate)
      const target = new Date(body.targetDate)
      const diffDays = Math.floor(
        (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      )
      weekNumber = Math.max(1, Math.min(13, Math.floor(diffDays / 7) + 1))
    } else {
      weekNumber = 1
    }
  }

  await prisma.milestone.create({
    data: {
      horizonId: body.horizonId,
      title: body.title,
      description: body.description || null,
      targetDate: body.targetDate,
      weekNumber,
      isCompleted: false,
    },
  })

  const data = await getUnifiedData(body.scheduledDate)
  return c.json({ success: true, ...data })
})

app.patch('/api/milestones/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))

  const updateData: Record<string, unknown> = {}
  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description
  if (body.targetDate !== undefined) updateData.targetDate = body.targetDate
  if (body.weekNumber !== undefined) updateData.weekNumber = body.weekNumber
  if (body.isCompleted !== undefined) updateData.isCompleted = body.isCompleted

  await prisma.milestone.update({ where: { id }, data: updateData })

  const data = await getUnifiedData(body.scheduledDate)
  return c.json({ success: true, ...data })
})

app.delete('/api/milestones/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.milestone.delete({ where: { id } })
  return c.json({ success: true })
})

// ==========================================
// API ROUTES — HABITS
// ==========================================

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
      lastCompletedDate: null,
    },
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
      scheduledDate: targetDate,
    },
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
      data: { isCompleted: nextState },
    })

    await prisma.habit.update({
      where: { id },
      data: {
        isCompletedToday:
          targetDate === todayStr ? nextState : habit.isCompletedToday,
        streak: nextState ? habit.streak + 1 : Math.max(0, habit.streak - 1),
        lastCompletedDate: nextState ? todayStr : null,
      },
    })
  }

  const data = await getUnifiedData(targetDate)
  return c.json({ success: true, ...data })
})

// ==========================================
// API ROUTES — TASKS
// ==========================================

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
      milestoneId: body.milestoneId || null,
      habitId: body.habitId || null,
      scheduledDate: targetDate,
    },
  })

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
      data: { isCompleted: nextState },
    })

    if (task.habitId) {
      const habit = await prisma.habit.findUnique({ where: { id: task.habitId } })
      if (habit) {
        await prisma.habit.update({
          where: { id: task.habitId },
          data: {
            isCompletedToday:
              targetDate === todayStr ? nextState : habit.isCompletedToday,
            streak: nextState ? habit.streak + 1 : Math.max(0, habit.streak - 1),
            lastCompletedDate: nextState ? todayStr : null,
          },
        })
      }
    }
  }

  const data = await getUnifiedData(targetDate)
  return c.json({ success: true, ...data })
})

app.patch('/api/tasks/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))

  const updateData: Record<string, unknown> = {}
  if (body.scheduledDate !== undefined) updateData.scheduledDate = body.scheduledDate
  if (body.isCompleted !== undefined) updateData.isCompleted = body.isCompleted
  if (body.horizonId !== undefined) updateData.horizonId = body.horizonId
  if (body.milestoneId !== undefined) updateData.milestoneId = body.milestoneId
  if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags)

  await prisma.task.update({
    where: { id },
    data: updateData,
  })

  return c.json({ success: true })
})

app.delete('/api/tasks/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.task.delete({ where: { id } })
  return c.json({ success: true })
})

// ==========================================
// API ROUTES — AI
// ==========================================

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
        `Review and finalize`,
      ],
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
                  text: `Break down the task "${title}" into 3 to 5 concise, actionable sub-tasks. Return ONLY a valid JSON array of strings, e.g. ["Step 1", "Step 2", "Step 3"]. Do not include codeblock markers or extra words.`,
                },
              ],
            },
          ],
        }),
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
        `Document outcomes and follow-ups`,
      ],
    })
  }
})

app.post('/api/ai/daily-plan', async (c) => {
  const { messages, existingTasks = [] } = await c.req
    .json()
    .catch(() => ({ messages: [], existingTasks: [] }))

  if (!messages || !Array.isArray(messages)) {
    return c.json({ error: 'Messages array is required' }, 400)
  }

  const currentLoads = { MORNING: 0, AFTERNOON: 0, EVENING: 0 }
  existingTasks.forEach(
    (t: {
      phase?: 'MORNING' | 'AFTERNOON' | 'EVENING'
      durationMinutes?: number
      isCompleted?: boolean
    }) => {
      if (!t.isCompleted && t.phase && currentLoads[t.phase] !== undefined) {
        currentLoads[t.phase] += t.durationMinutes || 30
      }
    }
  )

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return c.json({
      reply: "I'm ready to help plan your day! Tell me what's on your mind.",
      suggestedTasks: [],
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
        parts: [{ text: m.text }],
      })),
    ]

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    )

    const data = await response.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const cleanText = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleanText)

    return c.json({
      reply: parsed.reply || 'What else do you need to get done today?',
      suggestedTasks: Array.isArray(parsed.suggestedTasks) ? parsed.suggestedTasks : [],
    })
  } catch (err) {
    console.error('Daily Plan AI Error:', err)
    return c.json({
      reply:
        "Tell me what you'd like to achieve today, and I'll structure it into your schedule.",
      suggestedTasks: [],
    })
  }
})

// ==========================================
// API ROUTES — QUARTERLY PLANNING
// ==========================================

app.post('/api/ai/plan-quarter/interview', async (c) => {
  const { messages = [] } = await c.req.json().catch(() => ({ messages: [] }))

  if (!Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: 'messages array required' }, 400)
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return c.json({
      type: 'question',
      reply:
        "I'd normally ask you a few questions here, but the AI key isn't configured. Add GEMINI_API_KEY to your environment.",
    })
  }

  try {
    const todayStr = getTodayStr()
    const systemPrompt = QUARTER_INTERVIEW_SYSTEM_PROMPT.replace('{{TODAY}}', todayStr)

    const contents = [
      { parts: [{ text: systemPrompt }] },
      ...messages.map((m: { role: string; text: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
    ]

    const model = 'gemini-2.5-pro'

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TempoLS/1.0',
        },
        body: JSON.stringify({ contents }),
      }
    )

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Plan-quarter Gemini error:', response.status, errBody)
      throw new Error(`Gemini HTTP ${response.status}`)
    }

    const data = await response.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const cleanText = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleanText)

    if (parsed.type === 'plan' && parsed.plan) {
      return c.json({
        type: 'plan',
        reply: parsed.reply || 'Here is the plan.',
        plan: parsed.plan,
      })
    }

    return c.json({
      type: 'question',
      reply: parsed.reply || 'Tell me more.',
    })
  } catch (err) {
    console.error('Plan-quarter interview error:', err)
    return c.json({
      type: 'question',
      reply:
        'I had trouble reaching the AI service. Try again, or start fresh with a shorter goal description.',
    })
  }
})

app.post('/api/ai/plan-quarter/commit', async (c) => {
  const body = await c.req.json().catch(() => ({}))

  const plan = body.plan
  if (
    !plan ||
    !plan.horizon ||
    !Array.isArray(plan.milestones) ||
    !Array.isArray(plan.tasks)
  ) {
    return c.json({ error: 'Invalid plan payload' }, 400)
  }

  const scheduledDate = body.scheduledDate || getTodayStr()

  try {
    const horizon = await prisma.horizon.create({
      data: {
        title: plan.horizon.title || 'Quarterly Horizon',
        description: plan.horizon.description || null,
        targetTag: (plan.horizon.targetTag || 'general').toLowerCase(),
        horizonType: 'QUARTERLY',
        quarter: plan.horizon.quarter || null,
        startDate: plan.horizon.startDate || null,
        targetDate: plan.horizon.targetDate || null,
        keyResults: JSON.stringify(plan.horizon.keyResults || []),
        status: 'ACTIVE',
      },
    })

    const milestoneIdByTitle = new Map<string, string>()

    for (const m of plan.milestones) {
      if (!m.title || !m.targetDate) continue

      const created = await prisma.milestone.create({
        data: {
          horizonId: horizon.id,
          title: m.title,
          description: m.description || null,
          targetDate: m.targetDate,
          weekNumber: typeof m.weekNumber === 'number' ? m.weekNumber : 1,
          isCompleted: false,
        },
      })
      milestoneIdByTitle.set(m.title, created.id)
    }

    let tasksCreated = 0
    for (const t of plan.tasks) {
      if (!t.title || !t.scheduledDate) continue

      const milestoneId = t.milestoneTitle
        ? milestoneIdByTitle.get(t.milestoneTitle) || null
        : null

      await prisma.task.create({
        data: {
          title: t.title,
          description: null,
          phase: t.phase || 'MORNING',
          durationMinutes: t.durationMinutes || 60,
          isCompleted: false,
          provider: 'MANUAL',
          tags: JSON.stringify([plan.horizon.targetTag || 'general']),
          horizonId: horizon.id,
          milestoneId,
          habitId: null,
          scheduledDate: t.scheduledDate,
        },
      })
      tasksCreated++
    }

    const data = await getUnifiedData(scheduledDate)
    return c.json({
      success: true,
      horizonId: horizon.id,
      milestonesCreated: milestoneIdByTitle.size,
      tasksCreated,
      ...data,
    })
  } catch (err) {
    console.error('Plan-quarter commit error:', err)
    return c.json({ error: 'Failed to commit plan' }, 500)
  }
})

// ==========================================
// PRODUCTION FRONTEND STATIC SERVING
// ==========================================

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(import.meta.dirname, '../../frontend/dist')

  app.use('/*', serveStatic({ root: distPath }))
  app.get('*', serveStatic({ path: `${distPath}/index.html` }))
}

// ==========================================
// ERROR HANDLER
// ==========================================

app.onError((err, c) => {
  console.error('🔥 API CRASH DETECTED:')
  console.error('Message:', err.message)
  console.error('Stack:', err.stack)
  if ((err as any).cause) console.error('Cause:', (err as any).cause)
  return c.json({ error: err.message }, 500)
})

serve(
  {
    fetch: app.fetch,
    port: 3002,
    hostname: '0.0.0.0',
  },
  (info) => {
    console.log(`API running with SQLite persistence on http://localhost:${info.port}`)
  }
)