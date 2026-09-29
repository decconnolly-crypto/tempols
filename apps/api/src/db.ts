import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const dbUrl =
  process.env.NODE_ENV === 'production'
    ? 'file:/app/apps/api/prisma/dev.db'
    : `file:${path.resolve(apiDir, 'dev.db')}`

console.log(`[db] using sqlite at ${dbUrl}`)

const adapter = new PrismaBetterSqlite3({ url: dbUrl })

export const prisma = new PrismaClient({ adapter })