import crypto from 'crypto'

const GCM_ALGO = 'aes-256-gcm'
const IV_LENGTH = 12

type DecodedPayload = {
  iv: Buffer
  tag: Buffer
  cipherText: Buffer
}

function decodeBase64(value: string): Buffer {
  return Buffer.from(value, 'base64')
}

function encodeBase64(value: Buffer): string {
  return value.toString('base64')
}

function decodeCipherPayload(payload: string): DecodedPayload {
  const [ivPart, tagPart, cipherPart] = payload.split('.')
  if (!ivPart || !tagPart || !cipherPart) {
    throw new Error('Invalid encrypted payload format.')
  }

  return {
    iv: decodeBase64(ivPart),
    tag: decodeBase64(tagPart),
    cipherText: decodeBase64(cipherPart),
  }
}

function getRawKeyMaterial(): string {
  const value = process.env.TOKEN_ENC_KEY?.trim() ?? ''
  if (!value) {
    throw new Error('TOKEN_ENC_KEY is required for secure token storage.')
  }
  return value
}

function parseEncryptionKey(value: string): Buffer {
  if (/^[A-Fa-f0-9]{64}$/.test(value)) {
    return Buffer.from(value, 'hex')
  }

  const decoded = decodeBase64(value)
  if (decoded.length === 32) {
    return decoded
  }

  throw new Error('TOKEN_ENC_KEY must be a 32-byte base64 string or 64-char hex string.')
}

function getEncryptionKey(): Buffer {
  return parseEncryptionKey(getRawKeyMaterial())
}

export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = getEncryptionKey()
  const cipher = crypto.createCipheriv(GCM_ALGO, key, iv)

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${encodeBase64(iv)}.${encodeBase64(tag)}.${encodeBase64(encrypted)}`
}

export function decryptSecret(payload: string): string {
  const key = getEncryptionKey()
  const { iv, tag, cipherText } = decodeCipherPayload(payload)
  const decipher = crypto.createDecipheriv(GCM_ALGO, key, iv)
  decipher.setAuthTag(tag)

  const plain = Buffer.concat([decipher.update(cipherText), decipher.final()])
  return plain.toString('utf8')
}

