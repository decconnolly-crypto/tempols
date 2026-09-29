import { createRequire } from 'node:module'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'
const adapter = new PrismaBetterSqlite3({ url: dbUrl })

export const prisma = new PrismaClient({ adapter })