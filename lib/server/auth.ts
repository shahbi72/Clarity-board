import { prisma } from '@/lib/server/prisma'

export const DEMO_USER_ID = process.env.DEMO_USER_ID?.trim() || 'demo-user'

export async function getCurrentUserId(): Promise<string> {
  return DEMO_USER_ID
}

export async function ensureCurrentUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: 'Demo User' },
  })
}
