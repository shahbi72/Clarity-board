'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { mockChatMessages, suggestedQuestions, type ChatMessage } from '@/lib/mock-data'

type ExecutiveResponseTemplate = {
  executiveSummary: string
  riskContext: string
  risks: string[]
  impactContext: string
  impacts: string[]
  recommendationContext: string
  recommendations: string[]
}

const executiveResponseTemplates: Record<string, ExecutiveResponseTemplate> = {
  'which products are going out of stock?': {
    executiveSummary:
      'Inventory pressure is concentrated in three SKUs, with one product already at stockout and two operating below a one-week coverage threshold.',
    riskContext:
      'The primary risk is immediate demand leakage in high-velocity products, followed by customer churn from repeated stock unavailability.',
    risks: [
      'Fitness Tracker Pro is at 0 units and currently unable to capture demand.',
      'Organic Coffee Blend has 12 units with an estimated 3-day runway.',
      'Bluetooth Speaker Mini has 8 units with an estimated 5-day runway.',
    ],
    impactContext:
      'Without intervention, the shortfall is expected to reduce near-term revenue and weaken conversion in repeat sessions.',
    impacts: [
      'Projected daily revenue leakage is highest in Fitness Tracker Pro based on current demand velocity.',
      'Stockouts in two adjacent categories can reduce basket size and lower weekly gross margin contribution.',
    ],
    recommendationContext:
      'The most effective response is a staged replenishment plan aligned to urgency and margin profile.',
    recommendations: [
      'Execute immediate purchase orders for Fitness Tracker Pro and Organic Coffee Blend.',
      'Issue a secondary order for Bluetooth Speaker Mini with a 7-day buffer target.',
      'Set automatic reorder triggers at 14 days of projected coverage for top-demand SKUs.',
    ],
  },
  'what products are underperforming?': {
    executiveSummary:
      'Performance dispersion is being driven by one product with negative unit economics and one product materially below category benchmark.',
    riskContext:
      'The immediate risk is margin dilution from continuing to scale products that are not clearing target contribution thresholds.',
    risks: [
      'Eco-Friendly Water Bottle is operating at -$3,700 profit with costs exceeding revenue by 8.2%.',
      'Desk Organizer Set is 45% below category-average profitability.',
      'Current mix allocation is absorbing working capital without proportional return.',
    ],
    impactContext:
      'If this mix persists through the next planning cycle, profitability will underperform despite stable top-line volume.',
    impacts: [
      'Projected margin recovery from correcting Water Bottle unit economics is meaningful within one quarter.',
      'Repositioning low-yield inventory can improve capital efficiency and reduce carrying risk.',
    ],
    recommendationContext:
      'A targeted correction strategy should focus on economics first, then packaging and channel fit.',
    recommendations: [
      'Renegotiate supplier pricing or adjust retail pricing on Eco-Friendly Water Bottle immediately.',
      'Test bundle positioning for Desk Organizer Set to improve attach rate and effective margin.',
      'Reallocate marketing spend toward categories with proven contribution performance.',
    ],
  },
  'how can i increase my sales?': {
    executiveSummary:
      'The highest-confidence growth path combines inventory availability, margin-led assortment focus, and promotion timing optimization.',
    riskContext:
      'Growth is currently constrained by avoidable operational gaps rather than demand quality.',
    risks: [
      'Top-revenue SKU unavailability is capping realized sales despite active demand.',
      'Promotional effort is not fully aligned with peak conversion windows.',
      'Price architecture appears under-optimized in select high-intent products.',
    ],
    impactContext:
      'Addressing these constraints should lift both conversion and contribution margin in the next cycle.',
    impacts: [
      'Projected uplift from restoring top-demand inventory and timing promotions to peak days is material.',
      'Margin expansion is achievable through selective price optimization in resilient SKUs.',
    ],
    recommendationContext:
      'Execution should prioritize fast, measurable levers before broader strategic changes.',
    recommendations: [
      'Restore inventory depth in high-demand products before expanding paid acquisition.',
      'Prioritize Electronics in campaign allocation given stronger margin profile.',
      'Launch Wednesday/Thursday promotional tests and monitor incremental conversion.',
      'Run controlled price tests on Yoga Mat Premium with margin guardrails.',
    ],
  },
  'what should i restock?': {
    executiveSummary:
      'Restocking should be sequenced by revenue-at-risk and remaining days of supply, with immediate action on two critical SKUs.',
    riskContext:
      'Current stock posture exposes the business to short-term revenue loss and avoidable fulfillment instability.',
    risks: [
      'Fitness Tracker Pro is already stockout and currently not monetizing demand.',
      'Organic Coffee Blend is within a 3-day depletion window.',
      'Bluetooth Speaker Mini is within a 5-day depletion window.',
    ],
    impactContext:
      'A delayed restock cycle will likely suppress weekly revenue and increase reacquisition cost for returning buyers.',
    impacts: [
      'Projected revenue recovery is strongest when top two SKUs are replenished immediately.',
      'Maintaining a structured safety-stock policy lowers repeat stockout probability.',
    ],
    recommendationContext:
      'Use a two-wave procurement plan to stabilize availability while preserving cash discipline.',
    recommendations: [
      'Restock today: Fitness Tracker Pro (200 units) and Organic Coffee Blend (150 units).',
      'Restock this week: Bluetooth Speaker Mini (75 units) and Smart Home Hub based on turnover.',
      'Implement dynamic reorder points tied to demand velocity and supplier lead time.',
    ],
  },
  default: {
    executiveSummary:
      'Current performance remains fundamentally sound, with clear opportunities to improve margin resilience and capture incremental revenue.',
    riskContext:
      'The main strategic risk is allowing operational inefficiencies to compound while growth demand remains available.',
    risks: [
      'Inventory interruptions are limiting conversion on high-demand products.',
      'At least one product line is contributing negative margin.',
      'Resource allocation is not fully concentrated on highest-return categories.',
    ],
    impactContext:
      'With focused execution, the business can improve both top-line throughput and operating quality in the near term.',
    impacts: [
      'Projected impact includes stronger realized revenue and more stable gross margin performance.',
      'Improved assortment discipline is expected to increase capital productivity.',
    ],
    recommendationContext:
      'Prioritize decisions that protect margin quality while accelerating revenue capture.',
    recommendations: [
      'Resolve immediate stockout risks in high-velocity SKUs.',
      'Correct negative-margin products through pricing and procurement actions.',
      'Concentrate growth spend in categories with superior contribution profile.',
    ],
  },
}

function formatExecutiveResponse(template: ExecutiveResponseTemplate): string {
  const riskLines = template.risks.map((item) => `- ${item}`)
  const impactLines = template.impacts.map((item) => `- ${item}`)
  const recommendationLines = template.recommendations.map((item, index) => `${index + 1}. ${item}`)

  return [
    '**Executive Summary**',
    template.executiveSummary,
    '',
    '**Risk Analysis**',
    template.riskContext,
    ...riskLines,
    '',
    '**Business Impact**',
    template.impactContext,
    ...impactLines,
    '',
    '**Strategic Recommendation**',
    template.recommendationContext,
    ...recommendationLines,
  ].join('\n')
}

function getAIResponse(question: string): string {
  const normalizedQuestion = question.toLowerCase().trim()
  for (const [key, template] of Object.entries(executiveResponseTemplates)) {
    if (key === 'default') continue
    if (normalizedQuestion.includes(key) || key.includes(normalizedQuestion)) {
      return formatExecutiveResponse(template)
    }
  }
  return formatExecutiveResponse(executiveResponseTemplates.default)
}

export function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate AI response delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: getAIResponse(input),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setIsTyping(false)
    setMessages((prev) => [...prev, aiMessage])
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  return (
    <Card className="flex h-[600px] max-w-full flex-col overflow-hidden">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Business Assistant
        </CardTitle>
      </CardHeader>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="max-w-full space-y-4 overflow-hidden">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex max-w-full gap-3 overflow-hidden ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={
                    message.role === 'assistant'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {message.role === 'assistant' ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={`max-w-[75%] overflow-hidden rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <div className="max-w-none break-words whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
                <p
                  className={`mt-1 text-xs ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}
                >
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Preparing executive analysis...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="border-t border-border px-4 py-3">
        <p className="mb-2 text-xs text-muted-foreground">Suggested questions:</p>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.slice(0, 3).map((question) => (
            <Button
              key={question}
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-transparent"
              onClick={() => handleSuggestedQuestion(question)}
            >
              {question}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <CardContent className="border-t border-border p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Request an executive analysis of your business data..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <Button type="submit" size="icon" disabled={isTyping || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
