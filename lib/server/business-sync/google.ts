import { HttpError } from '@/lib/server/http-error'
import { prisma } from '@/lib/server/prisma'
import { decryptSecret, encryptSecret } from '@/lib/server/token-crypto'
import { logger } from '@/lib/reports/server/logger'

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_DRIVE_LIST_URL = 'https://www.googleapis.com/drive/v3/files'
const GOOGLE_SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4'

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ')

type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
}

type DriveListResponse = {
  files?: Array<{
    id?: string
    name?: string
    modifiedTime?: string
  }>
}

type SheetsMetadataResponse = {
  sheets?: Array<{
    properties?: {
      sheetId?: number
      title?: string
      gridProperties?: {
        rowCount?: number
        columnCount?: number
      }
    }
  }>
}

type ValuesResponse = {
  values?: Array<Array<string | number | boolean | null>>
}

export type GoogleSpreadsheetSummary = {
  id: string
  name: string
  modifiedTime: string | null
}

export type GoogleSheetTab = {
  id: number | null
  name: string
  rowCount: number | null
  columnCount: number | null
}

type OAuthCredentials = {
  clientId: string
  clientSecret: string
}

function getGoogleOAuthCredentials(): OAuthCredentials {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? ''

  if (!clientId || !clientSecret) {
    throw new HttpError(500, 'Google OAuth is not configured.')
  }

  return {
    clientId,
    clientSecret,
  }
}

function ensureAppUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? ''
  if (!baseUrl) {
    throw new HttpError(500, 'NEXT_PUBLIC_APP_URL is required for Google OAuth callback.')
  }

  return baseUrl.replace(/\/$/, '')
}

export function getGoogleCallbackUrl(): string {
  return `${ensureAppUrl()}/api/business/google/callback`
}

export function buildGoogleOAuthUrl(state: string): string {
  const { clientId } = getGoogleOAuthCredentials()
  const url = new URL(GOOGLE_OAUTH_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', getGoogleCallbackUrl())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('state', state)
  return url.toString()
}

async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleOAuthCredentials()
  const payload = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getGoogleCallbackUrl(),
    grant_type: 'authorization_code',
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  })

  if (!response.ok) {
    throw new HttpError(401, 'Google authorization failed. Please reconnect.')
  }

  return (await response.json()) as GoogleTokenResponse
}

async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleOAuthCredentials()
  const payload = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  })

  if (!response.ok) {
    throw new HttpError(401, 'Google token refresh failed. Please reconnect.')
  }

  return (await response.json()) as GoogleTokenResponse
}

export async function upsertGoogleConnectionFromCode(params: {
  userId: string
  code: string
}): Promise<void> {
  const tokenResponse = await exchangeCodeForTokens(params.code)
  const expiresAt = new Date(Date.now() + Math.max(60, tokenResponse.expires_in) * 1000)

  const existing = await prisma.sheetConnection.findUnique({
    where: { userId: params.userId },
    select: {
      encryptedRefreshToken: true,
      spreadsheetId: true,
      spreadsheetName: true,
      sheetName: true,
    },
  })

  const refreshToken = tokenResponse.refresh_token
    ? encryptSecret(tokenResponse.refresh_token)
    : existing?.encryptedRefreshToken ?? null

  await prisma.sheetConnection.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      provider: 'GOOGLE_SHEETS',
      encryptedAccessToken: encryptSecret(tokenResponse.access_token),
      encryptedRefreshToken: refreshToken,
      accessTokenExpiresAt: expiresAt,
      scope: tokenResponse.scope ?? null,
      spreadsheetId: existing?.spreadsheetId ?? null,
      spreadsheetName: existing?.spreadsheetName ?? null,
      sheetName: existing?.sheetName ?? null,
    },
    update: {
      encryptedAccessToken: encryptSecret(tokenResponse.access_token),
      encryptedRefreshToken: refreshToken,
      accessTokenExpiresAt: expiresAt,
      scope: tokenResponse.scope ?? null,
    },
  })
}

export async function getSheetConnectionForUser(userId: string) {
  return prisma.sheetConnection.findUnique({
    where: { userId },
  })
}

async function getValidAccessToken(connectionId: string): Promise<string> {
  const connection = await prisma.sheetConnection.findUnique({ where: { id: connectionId } })
  if (!connection || !connection.encryptedAccessToken) {
    throw new HttpError(404, 'Google Sheets connection is missing.')
  }

  const expiresAt = connection.accessTokenExpiresAt?.getTime() ?? 0
  const now = Date.now()
  if (expiresAt > now + 60_000) {
    return decryptSecret(connection.encryptedAccessToken)
  }

  if (!connection.encryptedRefreshToken) {
    throw new HttpError(401, 'Google refresh token missing. Reconnect your account.')
  }

  const tokenResponse = await refreshAccessToken(decryptSecret(connection.encryptedRefreshToken))
  const nextExpiresAt = new Date(Date.now() + Math.max(60, tokenResponse.expires_in) * 1000)

  await prisma.sheetConnection.update({
    where: { id: connection.id },
    data: {
      encryptedAccessToken: encryptSecret(tokenResponse.access_token),
      encryptedRefreshToken: tokenResponse.refresh_token
        ? encryptSecret(tokenResponse.refresh_token)
        : connection.encryptedRefreshToken,
      accessTokenExpiresAt: nextExpiresAt,
      scope: tokenResponse.scope ?? connection.scope,
    },
  })

  return tokenResponse.access_token
}

async function googleFetchJson<T>(accessToken: string, url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    logger.warn('Google API request failed', {
      status: response.status,
      url,
    })
    throw new HttpError(response.status, 'Google API request failed.')
  }

  return (await response.json()) as T
}

export async function listGoogleSpreadsheetsForUser(userId: string, query = ''): Promise<GoogleSpreadsheetSummary[]> {
  const connection = await getSheetConnectionForUser(userId)
  if (!connection) {
    throw new HttpError(404, 'Google Sheets connection not found. Connect first.')
  }

  const accessToken = await getValidAccessToken(connection.id)
  const safeQuery = query.trim().replace(/'/g, "\\'")
  const qParts = ["mimeType='application/vnd.google-apps.spreadsheet'", 'trashed=false']

  if (safeQuery) {
    qParts.push(`name contains '${safeQuery}'`)
  }

  const url = new URL(GOOGLE_DRIVE_LIST_URL)
  url.searchParams.set('q', qParts.join(' and '))
  url.searchParams.set('fields', 'files(id,name,modifiedTime)')
  url.searchParams.set('orderBy', 'modifiedTime desc')
  url.searchParams.set('pageSize', '25')

  const payload = await googleFetchJson<DriveListResponse>(accessToken, url.toString())

  return (payload.files ?? [])
    .filter((item) => Boolean(item.id && item.name))
    .map((item) => ({
      id: item.id ?? '',
      name: item.name ?? 'Untitled Sheet',
      modifiedTime: item.modifiedTime ?? null,
    }))
}

export async function listGoogleSheetTabsForUser(params: {
  userId: string
  spreadsheetId: string
}): Promise<GoogleSheetTab[]> {
  const connection = await getSheetConnectionForUser(params.userId)
  if (!connection) {
    throw new HttpError(404, 'Google Sheets connection not found. Connect first.')
  }

  const accessToken = await getValidAccessToken(connection.id)

  const url = new URL(`${GOOGLE_SHEETS_BASE_URL}/spreadsheets/${params.spreadsheetId}`)
  url.searchParams.set('fields', 'sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))')

  const payload = await googleFetchJson<SheetsMetadataResponse>(accessToken, url.toString())

  return (payload.sheets ?? [])
    .map((item) => item.properties)
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.title))
    .map((item) => ({
      id: item.sheetId ?? null,
      name: item.title ?? 'Sheet',
      rowCount: item.gridProperties?.rowCount ?? null,
      columnCount: item.gridProperties?.columnCount ?? null,
    }))
}

export async function saveGoogleSheetSelection(params: {
  userId: string
  spreadsheetId: string
  spreadsheetName: string
  sheetName: string
}): Promise<void> {
  const connection = await getSheetConnectionForUser(params.userId)
  if (!connection) {
    throw new HttpError(404, 'Google Sheets connection not found. Connect first.')
  }

  await prisma.sheetConnection.update({
    where: { id: connection.id },
    data: {
      spreadsheetId: params.spreadsheetId,
      spreadsheetName: params.spreadsheetName,
      sheetName: params.sheetName,
    },
  })
}

export async function fetchSelectedSheetValuesForUser(userId: string): Promise<{
  connectionId: string
  spreadsheetId: string
  spreadsheetName: string
  sheetName: string
  values: Array<Array<string | number | boolean | null>>
}> {
  const connection = await getSheetConnectionForUser(userId)
  if (!connection || !connection.spreadsheetId || !connection.sheetName) {
    throw new HttpError(400, 'No sheet selected. Connect and select a sheet first.')
  }

  const accessToken = await getValidAccessToken(connection.id)
  const encodedRange = encodeURIComponent(connection.sheetName)

  const url = new URL(
    `${GOOGLE_SHEETS_BASE_URL}/spreadsheets/${connection.spreadsheetId}/values/${encodedRange}`
  )
  url.searchParams.set('majorDimension', 'ROWS')
  url.searchParams.set('valueRenderOption', 'FORMATTED_VALUE')
  url.searchParams.set('dateTimeRenderOption', 'FORMATTED_STRING')

  const payload = await googleFetchJson<ValuesResponse>(accessToken, url.toString())

  return {
    connectionId: connection.id,
    spreadsheetId: connection.spreadsheetId,
    spreadsheetName: connection.spreadsheetName ?? 'Google Sheet',
    sheetName: connection.sheetName,
    values: payload.values ?? [],
  }
}

export async function clearGoogleConnectionForUser(userId: string): Promise<void> {
  const connection = await getSheetConnectionForUser(userId)
  if (!connection) {
    return
  }

  await prisma.sheetConnection.update({
    where: { id: connection.id },
    data: {
      spreadsheetId: null,
      spreadsheetName: null,
      sheetName: null,
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      accessTokenExpiresAt: null,
      scope: null,
      lastSyncedAt: null,
    },
  })
}
