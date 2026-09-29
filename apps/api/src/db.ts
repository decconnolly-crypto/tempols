import Database from 'better-sqlite3'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

// 1. Get the raw URL from the environment or fallback to local
const rawDbUrl = process.env.DATABASE_URL || 'file:./dev.db'

// 2. Strip the 'file:' or 'file://' prefix so better-sqlite3 gets a true file path
const dbFilePath = rawDbUrl.replace(/^file:(?:\/\/)?/, '')

// 3. Initialize SQLite with the clean path
const sqlite = new Database(dbFilePath)
const adapter = new PrismaBetterSqlite3(sqlite)

export const prisma = new PrismaClient({ adapter })