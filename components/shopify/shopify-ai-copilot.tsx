'use client'

import { useMemo, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { EffectivePlan, ShopifyCopilotContextPacket, ShopifyCopilotResponse } from '@/lib/types/shopify'

type CopilotMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ShopifyAiCopilotProps = {
  isDemoMode: boolean
  paywalled: boolean
  plan: EffectivePlan | null
  contextPacket: ShopifyCopilotContextPacket | null
}

const SUGGESTED_PROMPTS = [
  'Why did revenue change?',
  'Which product is risky?',
  'What should I fix first?',
  'Any profit leaks?',
]

export function ShopifyAiCopilot({
  isDemoMode,
  paywalled,
  plan,
  contextPacket,
}: ShopifyAiCopilotProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remainingToday, setRemainingToday] = useState<number | null>(null)

  const disabledReason = useMemo(() => {
    if (isDemoMode) {
      return 'AI Copilot is available for signed-in stores.'
    }

    if (paywalled) {
      return 'Trial expired. Subscribe to continue using AI Copilot.'
    }

    if (!contextPacket) {
      return 'Upload Shopify data to enable AI Copilot.'
    }

    return null
  }, [contextPacket, isDemoMode, paywalled])

  async function askCopilot(question: string) {
    if (!question.trim() || !contextPacket || disabledReason) {
      return
    }

    setIsSending(true)
    setError(null)

    const userMessage: CopilotMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: question.trim(),
    }
    setMessages((current) => [...current, userMessage])
    setInput('')

    try {
      const response = await fetch('/api/shopify/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          context: contextPacket,
        }),
      })

      const payload = (await response.json()) as ShopifyCopilotResponse | { error?: string }
      if (!response.ok || !('answer' in payload)) {
        throw new Error(('error' in payload && payload.error) || 'Unable to get AI response.')
      }

      const assistantMessage: CopilotMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: payload.answer,
      }

      setRemainingToday(payload.remainingQuestionsToday)
      setMessages((current) => [...current, assistantMessage])
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to get AI response.'
      setError(message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Copilot
        </CardTitle>
        <CardDescription>
          {plan === 'basic'
            ? `Starter includes 10 questions/day${remainingToday != null ? ` (${remainingToday} left today)` : ''}.`
            : 'Answers are generated from your store KPIs, deltas, and insights.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {disabledReason ? (
          <p className="rounded-md border border-border/70 bg-muted/40 p-3 text-sm text-muted-foreground">
            {disabledReason}
          </p>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Suggested prompts</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!disabledReason) {
                    void askCopilot(prompt)
                  }
                }}
                disabled={Boolean(disabledReason) || isSending}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-border/70 p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ask a question to get store-specific guidance.</p>
          ) : null}
          {messages.map((message) => (
            <div key={message.id} className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {message.role === 'user' ? 'You' : 'AI Copilot'}
              </p>
              <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
          ))}
          {isSending ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking...
            </p>
          ) : null}
        </div>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            void askCopilot(input)
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about revenue changes, risk products, or profit leaks."
            className="min-h-[84px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={Boolean(disabledReason) || isSending}
          />
          <Button type="submit" disabled={Boolean(disabledReason) || isSending || !input.trim()}>
            Ask Copilot
          </Button>
        </form>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
