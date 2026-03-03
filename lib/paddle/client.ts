'use client'

const PADDLE_SCRIPT_SOURCE = 'https://cdn.paddle.com/paddle/v2/paddle.js'

type PaddleEnvironment = 'production' | 'sandbox'

export type PaddleCheckoutOpenOptions = {
  transactionId?: string
  items?: Array<{
    priceId: string
    quantity: number
  }>
  customer?: {
    email?: string
  }
  customData?: Record<string, unknown>
  settings?: Record<string, unknown>
}

export type PaddleJs = {
  Environment: {
    set: (environment: PaddleEnvironment) => void
  }
  Initialize: (options: { token: string }) => void
  Checkout: {
    open: (options: PaddleCheckoutOpenOptions) => void
  }
}

declare global {
  interface Window {
    Paddle?: PaddleJs
    __clarityboardPaddleInitialized?: boolean
    __clarityboardPaddleScriptPromise?: Promise<void>
  }
}

function getPaddleEnvironment(): PaddleEnvironment {
  const raw = process.env.NEXT_PUBLIC_PADDLE_ENV?.trim().toLowerCase()
  return raw === 'production' ? 'production' : 'sandbox'
}

function getPaddleClientToken(): string {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? ''

  if (!token) {
    throw new Error('Missing NEXT_PUBLIC_PADDLE_CLIENT_TOKEN.')
  }

  return token
}

function loadPaddleScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Paddle.js can only be loaded in the browser.'))
  }

  if (window.Paddle) {
    return Promise.resolve()
  }

  if (window.__clarityboardPaddleScriptPromise) {
    return window.__clarityboardPaddleScriptPromise
  }

  window.__clarityboardPaddleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PADDLE_SCRIPT_SOURCE}"]`
    )

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Paddle.js.')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = PADDLE_SCRIPT_SOURCE
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Paddle.js.'))
    document.head.appendChild(script)
  })

  return window.__clarityboardPaddleScriptPromise
}

export async function getPaddleInstance(): Promise<PaddleJs> {
  await loadPaddleScript()
  const paddle = window.Paddle

  if (!paddle) {
    throw new Error('Paddle.js is unavailable.')
  }

  if (!window.__clarityboardPaddleInitialized) {
    if (getPaddleEnvironment() === 'sandbox') {
      paddle.Environment.set('sandbox')
    }

    paddle.Initialize({
      token: getPaddleClientToken(),
    })

    window.__clarityboardPaddleInitialized = true
  }

  return paddle
}
