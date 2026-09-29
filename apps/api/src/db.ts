import { createRequire } from 'node:module'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

// 1. Calculate the absolute path to apps/api based on this file's location
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const apiDir = path.resolve(__dirname, '..')

// 2. Get the database URL
const rawDbUrl = process.env.DATABASE_URL || 'file:./dev.db'

// 3. Extract the file path
let dbPath = rawDbUrl.replace(/^file:(?:\/\/)?/, '')

// 4. If relative, resolve to apps/api/prisma/<filename> so it always matches Prisma CLI
if (!path.isAbsolute(dbPath)) {
  const cleanFilename = path.basename(dbPath)
  dbPath = path.resolve(apiDir, 'prisma', cleanFilename)
}

const finalDbUrl = `file:${dbPath}`
console.log(`[Database] SQLite active at: ${finalDbUrl}`)

const adapter = new PrismaBetterSqlite3({ url: finalDbUrl })

export const prisma = new PrismaClient({ adapter })