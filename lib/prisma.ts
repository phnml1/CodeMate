import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/lib/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString =
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL or DIRECT_DATABASE_URL must be set')
  }

  // Supabase pooler URLs can terminate long-lived auth/session queries unexpectedly.
  // Prefer a direct connection when available and only fall back to DATABASE_URL.
  const adapter = new PrismaPg({ connectionString, max: 5 })

  return new PrismaClient({ adapter })
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }

  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = Reflect.get(client, prop)

    return typeof value === 'function' ? value.bind(client) : value
  },
})
