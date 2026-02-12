'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { mockChatMessages, suggestedQuestions, type ChatMessage } from '@/lib/mock-data'

const aiResponses: Record<string, string> = {
  'which products are going out of stock?': `Based on your current inventory data, I've identified the following products that need attention:

**Critical (Out of Stock):**
- Fitness Tracker Pro - 0 units remaining, high demand detected

**Low Stock (< 20 units):**
- Organic Coffee Blend - 12 units, estimated 3 days until depletion
- Bluetooth Speaker Mini - 8 units, estimated 5 days until depletion

I recommend creating purchase orders for these items immediately to avoid lost sales.`,

  'what products are underperforming?': `Looking at your profitability data, here are the underperforming products:

**Negative Margins:**
- Eco-Friendly Water Bottle: -$3,700 profit (expenses exceed revenue by 8.2%)

**Below Average Performance:**
- Desk Organizer Set: $10,600 profit (45% below category average)

Consider renegotiating supplier contracts or adjusting pricing for the Water Bottle. The Desk Organizer might benefit from bundling with other office products.`,

  'how can i increase my sales?': `Based on your data patterns, here are actionable recommendations:

1. **Restock High-Demand Items** - Fitness Tracker Pro has the highest revenue potential but is out of stock

2. **Bundle Strategy** - Premium Wireless Headphones + accessories could increase AOV by 23%

3. **Category Focus** - Electronics category shows strongest margins (average 42% profit)

4. **Timing** - Your sales peak on Wednesdays and Thursdays. Consider running promotions on these days.

5. **Price Optimization** - Yoga Mat Premium has room for a 10% price increase based on competitive analysis`,

  'what should i restock?': `Priority restock recommendations based on sales velocity and current inventory:

**Urgent (Restock Today):**
1. Fitness Tracker Pro - Out of stock, losing ~$3,400/day in potential revenue
2. Organic Coffee Blend - 3-day supply remaining

**This Week:**
3. Bluetooth Speaker Mini - 5-day supply remaining
4. Smart Home Hub - moderate turnover, healthy margins

**Suggested Order Quantities:**
- Fitness Tracker Pro: 200 units
- Organic Coffee Blend: 150 units
- Bluetooth Speaker Mini: 75 units`,

  default: `I've analyzed your business data and here's what I found:

Your overall performance is strong with a 32.4% profit margin this month. Key areas of focus should be:

1. **Inventory Management** - Several products need restocking
2. **Cost Optimization** - One product has negative margins
3. **Growth Opportunity** - Electronics category shows the highest potential

Would you like me to dive deeper into any of these areas?`,
}

function getAIResponse(question: string): string {
  const normalizedQuestion = question.toLowerCase().trim()
  for (const [key, value] of Object.entries(aiResponses)) {
    if (normalizedQuestion.includes(key) || key.includes(normalizedQuestion)) {
      return value
    }
  }
  return aiResponses.default
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
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Business Assistant
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
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
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
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
                <span className="text-sm text-muted-foreground">Analyzing your data...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

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
            placeholder="Ask about your business data..."
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
