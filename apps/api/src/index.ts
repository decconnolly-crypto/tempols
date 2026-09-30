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

// ==========================================
// RECIPE PARSING HELPERS
// ==========================================

function parseIsoDuration(duration: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(duration || '')
  if (!match) return 30
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const total = hours * 60 + minutes
  return total > 0 ? total : 30
}

function extractDomainName(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function extractJsonLdRecipe(html: string): {
  title: string
  ingredients: string[]
  instructions: Array<{ title?: string; text: string }>
  cookTime: number
  tags: string[]
} | null {
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const blocks: string[] = []
  let match
  while ((match = scriptRegex.exec(html)) !== null) {
    blocks.push(match[1])
  }

  for (const raw of blocks) {
    let parsed: any
    try {
      parsed = JSON.parse(raw.trim())
    } catch {
      continue
    }

    const candidates: any[] = []
    const collect = (node: any) => {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) {
        node.forEach(collect)
        return
      }
      if (node['@type'] === 'Recipe') candidates.push(node)
      if (Array.isArray(node['@graph'])) node['@graph'].forEach(collect)
    }
    collect(parsed)

    if (candidates.length === 0) continue
    const r = candidates[0]

    const rawIngredients: string[] = Array.isArray(r.recipeIngredient)
      ? r.recipeIngredient
      : []
    const ingredients = rawIngredients
      .map((i: any) =>
        typeof i === 'string' ? i.replace(/\s+/g, ' ').trim() : ''
      )
      .filter(Boolean)

    const instructions: Array<{ title?: string; text: string }> = []
    const collectInstructions = (node: any, sectionTitle?: string) => {
      if (!node) return
      if (typeof node === 'string') {
        const t = node.trim()
        if (t) instructions.push({ title: sectionTitle, text: t })
        return
      }
      if (Array.isArray(node)) {
        node.forEach((n) => collectInstructions(n, sectionTitle))
        return
      }
      if (typeof node === 'object') {
        const type = node['@type']
        if (type === 'HowToSection' && Array.isArray(node.itemListElement)) {
          const title = node.name?.trim() || sectionTitle
          node.itemListElement.forEach((child: any) =>
            collectInstructions(child, title)
          )
          return
        }
        const stepText = node.text?.trim() || node.name?.trim()
        if (stepText) {
          const match = /^([^–—]{3,60})\s*[–—]\s*(.+)$/.exec(stepText)
          if (match) {
            instructions.push({
              title: match[1].trim(),
              text: match[2].trim(),
            })
          } else {
            instructions.push({ title: sectionTitle, text: stepText })
          }
        }
      }
    }
    collectInstructions(r.recipeInstructions)

    const cookTime = parseIsoDuration(r.cookTime || r.totalTime || 'PT30M')

    const tagsRaw: string[] = []
    if (typeof r.recipeCuisine === 'string') tagsRaw.push(r.recipeCuisine)
    if (typeof r.recipeCategory === 'string') tagsRaw.push(r.recipeCategory)
    if (typeof r.keywords === 'string') {
      tagsRaw.push(...r.keywords.split(',').map((t: string) => t.trim()))
    } else if (Array.isArray(r.keywords)) {
      tagsRaw.push(...r.keywords.map((t: any) => String(t).trim()))
    }
    const tags = Array.from(
      new Set(tagsRaw.map((t) => t.toLowerCase()).filter(Boolean))
    )

    return {
      title: (r.name || '').trim() || 'Untitled recipe',
      ingredients,
      instructions,
      cookTime,
      tags,
    }
  }

  return null
}

async function extractWithGemini(
  html: string,
  apiKey: string
): Promise<{
  title: string
  ingredients: string[]
  instructions: Array<{ title?: string; text: string }>
  cookTime: number
  tags: string[]
} | null> {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20000)

  const prompt = `Extract the recipe from the following text and return ONLY valid JSON in this exact shape, no prose, no code fences:

{
  "title": "...",
  "ingredients": ["...", "..."],
  "instructions": [{ "title": "...", "text": "..." }, ...],
  "cookTime": 30,
  "tags": ["...", "..."]
}

Rules:
- ingredients: one string per ingredient, exactly as written on the page
- instructions: one object per step; "title" is optional (omit if the step has no short heading)
- cookTime: total time in minutes (a number, not a string)
- tags: any cuisine, dietary, or category tags you can infer from the page
- If you cannot find a full recipe, return {"error": "not a recipe"}

TEXT:
${text}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TempoLS/1.0',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    )

    const data = await res.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const clean = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    if (parsed.error) return null

    return {
      title: String(parsed.title || 'Untitled recipe'),
      ingredients: Array.isArray(parsed.ingredients)
        ? parsed.ingredients.map(String)
        : [],
      instructions: Array.isArray(parsed.instructions)
        ? parsed.instructions
            .map((i: any) =>
              typeof i === 'string'
                ? { text: i }
                : { title: i.title, text: i.text || '' }
            )
            .filter((i: any) => i.text)
        : [],
      cookTime: typeof parsed.cookTime === 'number' ? parsed.cookTime : 30,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    }
  } catch (err) {
    console.error('Gemini recipe extraction error:', err)
    return null
  }
}

// ── Date helpers for commitment recurrence and meal ranges ──

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

function expandCommitmentDates(
  commitment: {
    date: string
    recurrence: string
    recurrenceEndDate: string | null
  },
  rangeStart: string,
  rangeEnd: string
): string[] {
  const { date, recurrence, recurrenceEndDate } = commitment
  const results: string[] = []

  const effectiveEnd =
    recurrenceEndDate && recurrenceEndDate < rangeEnd
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
      if (candidate.getMonth() === m % 12) {
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

const MEAL_PLANNER_SYSTEM_PROMPT = `You are a meal planning assistant for a UK family. Your job is to fill a week's worth of dinners, one per day, respecting the household's weekly theme structure.

WEEKLY THEMES (fixed — never break these):
- Monday: Easy Dinner (low-effort, quick meals)
- Tuesday: Pasta Night (pasta-based dishes)
- Wednesday: Winter Warmers (stews, casseroles, hearty meals)
- Thursday: World Foods (curries, stir fries, Mexican, Asian)
- Friday: Fun Food (pizza, burgers, fish and chips — the treat night)
- Saturday: Fakeaway (home-made takeaway equivalents)
- Sunday: Sunday Lunch (roasts, big family meals)

Your job is to assign ONE recipe per day from the provided library. You MUST:
1. Only assign recipes whose category matches the day's theme (or 'ANY', which fits any day)
2. Prefer variety — avoid recipes that appear in the "recent meals" list
3. Consider the cook time — weekdays should lean towards shorter meals if there's a choice
4. Return exactly one meal per day
5. If a day's category has no suitable recipes in the library, return that day with recipeId: null and a note explaining why

You will receive:
- The week's dates, each with its theme
- The recipe library (with id, title, category, cookTime, tags)
- Recent meals (recipes used in the last 2 weeks)

Return ONLY valid JSON, no prose, no code fences:

{
  "reply": "short intro sentence",
  "assignments": [
    {
      "date": "YYYY-MM-DD",
      "recipeId": "recipe-id-or-null",
      "reason": "one short sentence explaining the choice"
    }
  ]
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

  const todayStr = getTodayStr()
  const isTodayOrPast = targetDate <= todayStr

  const rawTasks = await prisma.task.findMany({
    where: isTodayOrPast
      ? {
          OR: [
            { scheduledDate: targetDate },
            {
              scheduledDate: { lt: targetDate },
              isCompleted: false,
            },
          ],
        }
      : {
          scheduledDate: targetDate,
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

    const completedMilestones = horizonMilestones.filter(
      (m) => m.isCompleted
    ).length

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
    const horizon = await prisma.horizon.findUnique({
      where: { id: body.horizonId },
    })
    if (horizon?.startDate) {
      const start = new Date(horizon.startDate)
      const target = new Date(body.targetDate)
      const diffDaysCalc = Math.floor(
        (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      )
      weekNumber = Math.max(1, Math.min(13, Math.floor(diffDaysCalc / 7) + 1))
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
      const habit = await prisma.habit.findUnique({
        where: { id: task.habitId },
      })
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
  if (body.scheduledDate !== undefined)
    updateData.scheduledDate = body.scheduledDate
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
// API ROUTES — RECIPES
// ==========================================

app.post('/api/recipes/fetch-url', async (c) => {
  const { url } = await c.req.json().catch(() => ({}))

  if (!url || typeof url !== 'string') {
    return c.json({ error: 'url required' }, 400)
  }

  if (url.includes('instagram.com')) {
    return c.json(
      {
        error:
          "Instagram URLs can't be fetched directly. Paste the caption text instead.",
        needsText: true,
      },
      400
    )
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        Accept: 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      return c.json({ error: `Site returned ${res.status}.` }, 400)
    }

    const html = await res.text()

    const jsonLd = extractJsonLdRecipe(html)

    if (
      jsonLd &&
      jsonLd.ingredients.length > 0 &&
      jsonLd.instructions.length > 0
    ) {
      return c.json({
        success: true,
        source: 'json-ld',
        recipe: {
          ...jsonLd,
          sourceUrl: url,
          sourceName: extractDomainName(url),
        },
      })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return c.json(
        { error: 'Could not parse this page. AI fallback not configured.' },
        400
      )
    }

    const fallback = await extractWithGemini(html, apiKey)
    if (!fallback) {
      return c.json(
        { error: 'Could not extract a recipe from that page.' },
        400
      )
    }

    return c.json({
      success: true,
      source: 'gemini',
      recipe: {
        ...fallback,
        sourceUrl: url,
        sourceName: extractDomainName(url),
      },
    })
  } catch (err) {
    console.error('fetch-url error:', err)
    return c.json({ error: 'Could not reach that URL.' }, 500)
  }
})

app.get('/api/recipes', async (c) => {
  const recipes = await prisma.recipe.findMany({
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })

  return c.json({
    recipes: recipes.map((r) => ({
      ...r,
      ingredients: safeParseJson<unknown[]>(r.ingredients, []),
      instructions: safeParseJson<Array<{ title?: string; text: string }>>(
        r.instructions,
        []
      ),
      tags: safeParseJson<string[]>(r.tags, []),
    })),
  })
})

app.post('/api/recipes', async (c) => {
  const body = await c.req.json()

  if (!body.title || !body.category) {
    return c.json({ error: 'title and category required' }, 400)
  }

  const recipe = await prisma.recipe.create({
    data: {
      title: body.title,
      category: body.category,
      ingredients: JSON.stringify(body.ingredients || []),
      instructions: JSON.stringify(body.instructions || []),
      cookTime: body.cookTime || 30,
      tags: JSON.stringify(body.tags || []),
      notes: body.notes || null,
      sourceUrl: body.sourceUrl || null,
      sourceName: body.sourceName || null,
    },
  })

  return c.json({
    success: true,
    recipe: {
      ...recipe,
      ingredients: safeParseJson(recipe.ingredients, []),
      instructions: safeParseJson(recipe.instructions, []),
      tags: safeParseJson(recipe.tags, []),
    },
  })
})

app.patch('/api/recipes/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))

  const updateData: Record<string, unknown> = {}
  if (body.title !== undefined) updateData.title = body.title
  if (body.category !== undefined) updateData.category = body.category
  if (body.ingredients !== undefined)
    updateData.ingredients = JSON.stringify(body.ingredients)
  if (body.instructions !== undefined)
    updateData.instructions = JSON.stringify(body.instructions)
  if (body.cookTime !== undefined) updateData.cookTime = body.cookTime
  if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags)
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.sourceUrl !== undefined) updateData.sourceUrl = body.sourceUrl
  if (body.sourceName !== undefined) updateData.sourceName = body.sourceName

  const recipe = await prisma.recipe.update({ where: { id }, data: updateData })

  return c.json({
    success: true,
    recipe: {
      ...recipe,
      ingredients: safeParseJson(recipe.ingredients, []),
      instructions: safeParseJson(recipe.instructions, []),
      tags: safeParseJson(recipe.tags, []),
    },
  })
})

app.delete('/api/recipes/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.recipe.delete({ where: { id } })
  return c.json({ success: true })
})

// ==========================================
// API ROUTES — MEALS
// ==========================================

app.get('/api/meals', async (c) => {
  const start = c.req.query('start') || getTodayStr()
  const end = c.req.query('end') || addDays(start, 6)

  const meals = await prisma.meal.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    include: { recipe: true },
    orderBy: { date: 'asc' },
  })

  return c.json({
    start,
    end,
    meals: meals.map((m) => ({
      id: m.id,
      date: m.date,
      mealType: m.mealType,
      notes: m.notes,
      recipe: m.recipe
        ? {
            id: m.recipe.id,
            title: m.recipe.title,
            category: m.recipe.category,
            cookTime: m.recipe.cookTime,
            ingredients: safeParseJson(m.recipe.ingredients, []),
            instructions: safeParseJson(m.recipe.instructions, []),
            tags: safeParseJson(m.recipe.tags, []),
            notes: m.recipe.notes,
            sourceUrl: m.recipe.sourceUrl,
            sourceName: m.recipe.sourceName,
            createdAt: m.recipe.createdAt,
          }
        : null,
    })),
  })
})

app.post('/api/meals', async (c) => {
  const body = await c.req.json()

  if (!body.date) {
    return c.json({ error: 'date required' }, 400)
  }

  const mealType = body.mealType || 'DINNER'

  if (body.recipeId) {
    const recipe = await prisma.recipe.findUnique({
      where: { id: body.recipeId },
    })
    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 400)
    }
  }

  const meal = await prisma.meal.upsert({
    where: {
      date_mealType: {
        date: body.date,
        mealType,
      },
    },
    create: {
      date: body.date,
      mealType,
      recipeId: body.recipeId || null,
      notes: body.notes || null,
    },
    update: {
      recipeId: body.recipeId !== undefined ? body.recipeId : undefined,
      notes: body.notes !== undefined ? body.notes : undefined,
    },
    include: { recipe: true },
  })

  return c.json({
    success: true,
    meal: {
      id: meal.id,
      date: meal.date,
      mealType: meal.mealType,
      notes: meal.notes,
      recipe: meal.recipe
        ? {
            id: meal.recipe.id,
            title: meal.recipe.title,
            category: meal.recipe.category,
            cookTime: meal.recipe.cookTime,
            ingredients: safeParseJson(meal.recipe.ingredients, []),
            instructions: safeParseJson(meal.recipe.instructions, []),
            tags: safeParseJson(meal.recipe.tags, []),
            notes: meal.recipe.notes,
            sourceUrl: meal.recipe.sourceUrl,
            sourceName: meal.recipe.sourceName,
            createdAt: meal.recipe.createdAt,
          }
        : null,
    },
  })
})

app.delete('/api/meals/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.meal.delete({ where: { id } })
  return c.json({ success: true })
})

app.get('/api/meals/shopping-list', async (c) => {
  const start = c.req.query('start') || getTodayStr()
  const end = c.req.query('end') || addDays(start, 6)

  const meals = await prisma.meal.findMany({
    where: { date: { gte: start, lte: end } },
    include: { recipe: true },
  })

  const flat: Array<{
    name: string
    quantity?: string
    unit?: string
    from: string[]
  }> = []

  for (const meal of meals) {
    if (!meal.recipe) continue
    const ingredients = safeParseJson<unknown[]>(meal.recipe.ingredients, [])

    for (const raw of ingredients) {
      let name: string
      let quantity: string | undefined
      let unit: string | undefined

      if (typeof raw === 'string') {
        // Fetched recipes: one string per ingredient.
        // Use the whole string as the "name" for now.
        name = raw.trim()
      } else if (raw && typeof raw === 'object') {
        const obj = raw as { name?: string; quantity?: string; unit?: string }
        name = (obj.name || '').trim()
        quantity = obj.quantity
        unit = obj.unit
      } else {
        continue
      }

      if (!name) continue
      const key = name.toLowerCase()
      const existing = flat.find((f) => f.name.toLowerCase() === key)
      if (existing) {
        existing.from.push(meal.recipe!.title)
        if (
          existing.quantity &&
          quantity &&
          existing.quantity !== quantity
        ) {
          existing.quantity = 'as needed'
        }
      } else {
        flat.push({
          name,
          quantity,
          unit,
          from: [meal.recipe!.title],
        })
      }
    }
  }

  flat.sort((a, b) => a.name.localeCompare(b.name))

  return c.json({ start, end, shoppingList: flat })
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
  const {
    messages,
    existingTasks = [],
    commitments = [],
    habits = [],
  } = await c.req
    .json()
    .catch(() => ({
      messages: [],
      existingTasks: [],
      commitments: [],
      habits: [],
    }))

  if (!messages || !Array.isArray(messages)) {
    return c.json({ error: 'Messages array is required' }, 400)
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return c.json({
      reply: "I'm ready to help plan your day! Tell me what's on your mind.",
      suggestedTasks: [],
    })
  }

  try {
    const openTasks = (
      existingTasks as Array<{
        title: string
        durationMinutes?: number
        phase?: string
        isCompleted?: boolean
        habitId?: string | null
      }>
    ).filter((t) => !t.isCompleted && !t.habitId)

    const openHabits = (
      habits as Array<{
        title: string
        durationMinutes?: number
        phase?: string
        isCompletedToday?: boolean
      }>
    ).filter((h) => !h.isCompletedToday)

    const sortedCommitments = (
      commitments as Array<{
        title: string
        startTime: string
        endTime?: string | null
        child?: string | null
      }>
    ).sort((a, b) => a.startTime.localeCompare(b.startTime))

    const tasksContext =
      openTasks.length > 0
        ? openTasks
            .map(
              (t) =>
                `- ${t.title} (${t.durationMinutes || 30}m, ${
                  t.phase || 'MORNING'
                })`
            )
            .join('\n')
        : '- None'

    const commitmentsContext =
      sortedCommitments.length > 0
        ? sortedCommitments
            .map(
              (c) =>
                `- ${c.startTime}${c.endTime ? `-${c.endTime}` : ''} ${
                  c.title
                }${c.child ? ` (${c.child})` : ''}`
            )
            .join('\n')
        : '- None'

    const habitsContext =
      openHabits.length > 0
        ? openHabits
            .map(
              (h) =>
                `- ${h.title} (${h.durationMinutes || 20}m, ${
                  h.phase || 'MORNING'
                })`
            )
            .join('\n')
        : '- None'

    const systemPrompt = `You are an executive daily planning coach for a minimalist Life OS. You help the user fit their priorities into today, respecting the fixed points they already have.

TODAY'S CONTEXT:

Open tasks (not yet completed):
${tasksContext}

Fixed commitments (time-bound, cannot be moved):
${commitmentsContext}

Habits still to do today:
${habitsContext}

SCHEDULING RULES:
1. Work / professional / focus-heavy tasks go into MORNING or AFTERNOON. Never EVENING.
2. Personal, relaxing, or lightweight tasks can go into EVENING.
3. Do NOT schedule tasks that would overlap with a fixed commitment. If the user has a 3:15pm commitment, don't put a 90-minute focus task starting at 2:45pm.
4. Habits are already part of the day — don't duplicate them as new tasks, but factor their time into your reasoning.
5. If the user is already heavily loaded, say so in your reply rather than silently over-scheduling.
6. Be specific in your reply. Reference the actual commitments or tasks you're working around.

Return ONLY a valid JSON object matching this structure:
{
  "reply": "1-2 sentence response that references the user's actual day.",
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
      suggestedTasks: Array.isArray(parsed.suggestedTasks)
        ? parsed.suggestedTasks
        : [],
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
    const systemPrompt = QUARTER_INTERVIEW_SYSTEM_PROMPT.replace(
      '{{TODAY}}',
      todayStr
    )

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
// API ROUTES — MEAL PLANNING (AI)
// ==========================================

app.post('/api/ai/plan-meals', async (c) => {
  const { startDate } = await c.req
    .json()
    .catch(() => ({ startDate: getTodayStr() }))

  const start = startDate || getTodayStr()

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return c.json(
      {
        error:
          'AI key not configured. Add GEMINI_API_KEY to your environment to use AI meal planning.',
      },
      400
    )
  }

  try {
    const days: Array<{ date: string; weekday: string; theme: string }> = []
    const THEMES: Record<number, string> = {
      0: 'Sunday Lunch',
      1: 'Easy Dinner',
      2: 'Pasta Night',
      3: 'Winter Warmers',
      4: 'World Foods',
      5: 'Fun Food',
      6: 'Fakeaway',
    }

    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i)
      const d = parseDateStr(date)
      const theme = THEMES[d.getDay()]
      days.push({
        date,
        weekday: d.toLocaleDateString('en-GB', { weekday: 'long' }),
        theme,
      })
    }

    const recipes = await prisma.recipe.findMany()
    const recipeLibrary = recipes.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      cookTime: r.cookTime,
      tags: safeParseJson<string[]>(r.tags, []),
    }))

    const recentStart = addDays(start, -14)
    const recentEnd = addDays(start, -1)
    const recentMeals = await prisma.meal.findMany({
      where: { date: { gte: recentStart, lte: recentEnd } },
      include: { recipe: true },
    })
    const recentRecipeTitles = recentMeals
      .filter((m) => m.recipe)
      .map((m) => `${m.recipe!.title} (${m.date})`)

    const daysContext = days
      .map((d) => `- ${d.date} (${d.weekday}) — theme: ${d.theme}`)
      .join('\n')

    const libraryContext =
      recipeLibrary.length > 0
        ? recipeLibrary
            .map(
              (r) =>
                `- id: ${r.id} | "${r.title}" | category: ${r.category} | ${
                  r.cookTime
                }m${r.tags.length ? ` | tags: ${r.tags.join(', ')}` : ''}`
            )
            .join('\n')
        : '(library is empty)'

    const recentContext =
      recentRecipeTitles.length > 0
        ? recentRecipeTitles.map((r) => `- ${r}`).join('\n')
        : '(nothing recent)'

    const userPrompt = `Plan next week's dinners.

WEEK AHEAD:
${daysContext}

RECIPE LIBRARY:
${libraryContext}

RECENTLY USED (avoid repeating these):
${recentContext}

Assign one recipe per day. Respect the theme categories strictly. Return the JSON as specified.`

    const model = 'gemini-2.5-pro'

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TempoLS/1.0',
        },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: MEAL_PLANNER_SYSTEM_PROMPT }] },
            { parts: [{ text: userPrompt }] },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Plan-meals Gemini error:', response.status, errBody)
      throw new Error(`Gemini HTTP ${response.status}`)
    }

    const data = await response.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const cleanText = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleanText)

    return c.json({
      reply: parsed.reply || 'Here is the week.',
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      days,
    })
  } catch (err) {
    console.error('Plan-meals error:', err)
    return c.json({ error: 'Could not generate a meal plan. Try again.' }, 500)
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
    console.log(
      `API running with SQLite persistence on http://localhost:${info.port}`
    )
  }
)