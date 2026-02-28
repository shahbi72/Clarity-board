import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/server/prisma'
import { writeAuditLog } from '@/lib/reports/server/audit'
import { encryptSecret } from '@/lib/reports/security/token-crypto'
import { logger } from '@/lib/reports/server/logger'
import { ensureTrialSubscription, ensureWorkspaceForUser, getPrimaryWorkspaceId } from '@/lib/reports/server/tenancy'

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ')

function credentialsProviderEnabled(): boolean {
  return process.env.ENABLE_CREDENTIALS_AUTH === '1'
}

function buildProviders(): NextAuthOptions['providers'] {
  const providers: NextAuthOptions['providers'] = [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          prompt: 'consent',
          access_type: 'offline',
          include_granted_scopes: 'true',
          response_type: 'code',
        },
      },
    }),
  ]

  if (credentialsProviderEnabled()) {
    providers.push(
      CredentialsProvider({
        id: 'credentials',
        name: 'Email and Password',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize() {
          // Optional hook for future credentials auth implementation.
          return null
        },
      })
    )
  }

  return providers
}

async function storeGoogleConnection(params: {
  userId: string
  workspaceId: string
  email: string | null
  scope: string | null
  accessToken: string | null
  refreshToken: string | null
  expiresAtUnix: number | null
}): Promise<void> {
  const encryptedAccessToken = params.accessToken ? encryptSecret(params.accessToken) : undefined
  const encryptedRefreshToken = params.refreshToken ? encryptSecret(params.refreshToken) : undefined

  await prisma.connection.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: params.workspaceId,
        provider: 'GOOGLE',
      },
    },
    create: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      provider: 'GOOGLE',
      encryptedAccessToken,
      encryptedRefreshToken,
      accessTokenExpiresAt: params.expiresAtUnix ? new Date(params.expiresAtUnix * 1000) : null,
      scope: params.scope,
      googleAccountEmail: params.email,
      disconnectedAt: null,
      revokedAt: null,
      lastUsedAt: new Date(),
    },
    update: {
      userId: params.userId,
      encryptedAccessToken,
      encryptedRefreshToken,
      accessTokenExpiresAt: params.expiresAtUnix ? new Date(params.expiresAtUnix * 1000) : null,
      scope: params.scope,
      googleAccountEmail: params.email,
      disconnectedAt: null,
      revokedAt: null,
      lastUsedAt: new Date(),
    },
  })
}

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/reports/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      const email = user.email?.trim().toLowerCase() ?? null
      if (!email) {
        return false
      }

      const dbUser = await prisma.user.upsert({
        where: { email },
        update: {
          email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
        create: {
          email,
          name: user.name ?? null,
          image: user.image ?? null,
        },
      })

      const workspaceId = await ensureWorkspaceForUser(dbUser.id, dbUser.name ?? email)
      await ensureTrialSubscription(dbUser.id, workspaceId)

      if (account?.provider === 'google') {
        try {
          await storeGoogleConnection({
            userId: dbUser.id,
            workspaceId,
            email,
            scope: account.scope ?? null,
            accessToken: account.access_token ?? null,
            refreshToken: account.refresh_token ?? null,
            expiresAtUnix: account.expires_at ?? null,
          })
        } catch (error) {
          logger.error('Failed storing encrypted Google tokens', {
            userId: dbUser.id,
            workspaceId,
            message: error instanceof Error ? error.message : 'unknown_error',
          })
          return false
        }
      }

      await writeAuditLog({
        workspaceId,
        userId: dbUser.id,
        action: 'auth.sign_in',
        resourceType: 'user',
        resourceId: dbUser.id,
        metadata: {
          provider: account?.provider ?? 'unknown',
        },
      })

      user.id = dbUser.id
      user.workspaceId = workspaceId
      return true
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id
      }

      if (user?.workspaceId !== undefined) {
        token.workspaceId = user.workspaceId
      }

      if (!token.userId && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        })

        if (dbUser) {
          token.userId = dbUser.id
        }
      }

      if (token.userId && !token.workspaceId) {
        token.workspaceId = await getPrimaryWorkspaceId(token.userId)
      }

      return token
    },

    async session({ session, token }) {
      if (!session.user || !token.userId) {
        return session
      }

      session.user.id = token.userId
      session.user.workspaceId = token.workspaceId ?? null
      return session
    },
  },
}

export async function getReportsSession() {
  return getServerSession(authOptions)
}

