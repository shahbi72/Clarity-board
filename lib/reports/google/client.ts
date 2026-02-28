import { ApiError } from '@/lib/reports/server/api-error'
import { logger } from '@/lib/reports/server/logger'
import { decryptSecret, encryptSecret } from '@/lib/reports/security/token-crypto'
import { prisma } from '@/lib/server/prisma'

const GOOGLE_DRIVE_LIST_URL = 'https://www.googleapis.com/drive/v3/files'
const GOOGLE_SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

type GoogleTokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
  token_type?: string
}

export type SpreadsheetSummary = {
  id: string
  name: string
  modifiedTime: string | null
}

export type SheetTabSummary = {
  id: number | null
  name: string
  rowCount: number | null
  columnCount: number | null
}

export async function getGoogleConnection(workspaceId: string, userId: string) {
  const connection = await prisma.connection.findFirst({
    where: {
      workspaceId,
      userId,
      provider: 'GOOGLE',
      disconnectedAt: null,
    },
  })

  if (!connection) {
    throw new ApiError(404, 'google_connection_missing', 'Google account is not connected.')
  }

  return connection
}

async function refreshGoogleAccessToken(params: {
  connectionId: string
  refreshToken: string
}): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new ApiError(500, 'google_oauth_not_configured', 'Google OAuth credentials are not configured.')
  }

  const payload = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: params.refreshToken,
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
    logger.error('Google token refresh failed', {
      status: response.status,
      connectionId: params.connectionId,
    })
    throw new ApiError(401, 'google_token_refresh_failed', 'Failed to refresh Google access token.')
  }

  const tokenResponse = (await response.json()) as GoogleTokenResponse

  const expiresAt = new Date(Date.now() + Math.max(60, tokenResponse.expires_in) * 1000)

  await prisma.connection.update({
    where: { id: params.connectionId },
    data: {
      encryptedAccessToken: encryptSecret(tokenResponse.access_token),
      encryptedRefreshToken: tokenResponse.refresh_token
        ? encryptSecret(tokenResponse.refresh_token)
        : undefined,
      accessTokenExpiresAt: expiresAt,
      scope: tokenResponse.scope,
      lastUsedAt: new Date(),
    },
  })

  return tokenResponse.access_token
}

export async function getGoogleAccessToken(connectionId: string): Promise<string> {
  const connection = await prisma.connection.findUnique({ where: { id: connectionId } })

  if (!connection) {
    throw new ApiError(404, 'google_connection_missing', 'Google connection not found.')
  }

  const encryptedAccessToken = connection.encryptedAccessToken
  const encryptedRefreshToken = connection.encryptedRefreshToken
  const expiresAt = connection.accessTokenExpiresAt?.getTime() ?? 0
  const now = Date.now()

  if (encryptedAccessToken && expiresAt > now + 60_000) {
    await prisma.connection.update({
      where: { id: connection.id },
      data: { lastUsedAt: new Date() },
    })
    return decryptSecret(encryptedAccessToken)
  }

  if (!encryptedRefreshToken) {
    throw new ApiError(401, 'google_refresh_token_missing', 'Google connection is missing a refresh token.')
  }

  return refreshGoogleAccessToken({
    connectionId: connection.id,
    refreshToken: decryptSecret(encryptedRefreshToken),
  })
}

async function googleFetch<T>(accessToken: string, url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new ApiError(response.status, 'google_api_error', 'Google API request failed.')
  }

  return (await response.json()) as T
}

type DriveFilesResponse = {
  files?: Array<{
    id?: string
    name?: string
    modifiedTime?: string
  }>
}

export async function listSpreadsheets(params: {
  connectionId: string
  query?: string
  pageSize?: number
}): Promise<SpreadsheetSummary[]> {
  const accessToken = await getGoogleAccessToken(params.connectionId)
  const safeQuery = (params.query ?? '').trim().replace(/'/g, "\\'")
  const qParts = ["mimeType='application/vnd.google-apps.spreadsheet'", 'trashed=false']

  if (safeQuery) {
    qParts.push(`name contains '${safeQuery}'`)
  }

  const pageSize = Math.max(1, Math.min(params.pageSize ?? 20, 100))
  const url = new URL(GOOGLE_DRIVE_LIST_URL)
  url.searchParams.set('q', qParts.join(' and '))
  url.searchParams.set('fields', 'files(id,name,modifiedTime)')
  url.searchParams.set('orderBy', 'modifiedTime desc')
  url.searchParams.set('pageSize', String(pageSize))

  const data = await googleFetch<DriveFilesResponse>(accessToken, url.toString())

  return (data.files ?? [])
    .filter((file) => Boolean(file.id && file.name))
    .map((file) => ({
      id: file.id ?? '',
      name: file.name ?? 'Untitled Sheet',
      modifiedTime: file.modifiedTime ?? null,
    }))
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

export async function listSpreadsheetTabs(params: {
  connectionId: string
  spreadsheetId: string
}): Promise<SheetTabSummary[]> {
  const accessToken = await getGoogleAccessToken(params.connectionId)
  const url = new URL(`${GOOGLE_SHEETS_BASE_URL}/spreadsheets/${params.spreadsheetId}`)
  url.searchParams.set('fields', 'sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))')

  const data = await googleFetch<SheetsMetadataResponse>(accessToken, url.toString())

  return (data.sheets ?? [])
    .map((item) => item.properties)
    .filter((props): props is NonNullable<typeof props> => Boolean(props?.title))
    .map((props) => ({
      id: props.sheetId ?? null,
      name: props.title ?? 'Sheet',
      rowCount: props.gridProperties?.rowCount ?? null,
      columnCount: props.gridProperties?.columnCount ?? null,
    }))
}

type ValuesResponse = {
  range?: string
  values?: Array<Array<string | number | boolean | null>>
}

export async function pullSheetValues(params: {
  connectionId: string
  spreadsheetId: string
  sheetName: string
}): Promise<Array<Array<string | number | boolean | null>>> {
  const accessToken = await getGoogleAccessToken(params.connectionId)
  const encodedRange = encodeURIComponent(params.sheetName)
  const url = new URL(`${GOOGLE_SHEETS_BASE_URL}/spreadsheets/${params.spreadsheetId}/values/${encodedRange}`)
  url.searchParams.set('majorDimension', 'ROWS')
  url.searchParams.set('valueRenderOption', 'FORMATTED_VALUE')
  url.searchParams.set('dateTimeRenderOption', 'FORMATTED_STRING')

  const data = await googleFetch<ValuesResponse>(accessToken, url.toString())
  return data.values ?? []
}

export async function revokeGoogleConnection(connectionId: string): Promise<void> {
  const connection = await prisma.connection.findUnique({ where: { id: connectionId } })

  if (!connection) {
    return
  }

  const encryptedAccessToken = connection.encryptedAccessToken

  if (encryptedAccessToken) {
    const token = decryptSecret(encryptedAccessToken)
    const url = new URL('https://oauth2.googleapis.com/revoke')
    url.searchParams.set('token', token)

    try {
      await fetch(url.toString(), { method: 'POST' })
    } catch {
      // Best-effort revoke.
    }
  }

  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      disconnectedAt: new Date(),
      revokedAt: new Date(),
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      accessTokenExpiresAt: null,
    },
  })
}

