import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// Absolute path to apps/api, regardless of process cwd
const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Normalize DATABASE_URL: turn relative sqlite paths into absolute ones
// rooted at apps/api, so prisma db push and the runtime always agree.
function resolveDbUrl(raw: string): string {
  // Handles: "file:./prisma/dev.db", "file:prisma/dev.db", "./prisma/dev.db"
  const withoutScheme = raw.startsWith('file:') ? raw.slice('file:'.length) : raw
  if (path.isAbsolute(withoutScheme)) {
    return `file:${withoutScheme}`
  }
  return `file:${path.resolve(apiDir, withoutScheme)}`
}

const rawDbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db'
const dbUrl = resolveDbUrl(rawDbUrl)

const adapter = new PrismaBetterSqlite3({ url: dbUrl })

export const prisma = new PrismaClient({ adapter })