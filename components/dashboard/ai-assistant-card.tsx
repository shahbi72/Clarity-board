'use client'

import Link from 'next/link'
import { Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AIAssistantCard() {
  return (
    <Card className="border-border/60 bg-card shadow-sm elite-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span className="icon-chip icon-chip-primary h-9 w-9">
            <Bot className="h-4 w-4" />
          </span>
          AI Assistant
        </CardTitle>
        <CardDescription>
          Always available to help your business make faster decisions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-muted-foreground">Online now - replies instantly</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Ask about cash flow, overdue invoices, or profit trends.
        </div>
        <Button asChild size="sm" className="w-full">
          <Link href="/assistant">Open AI assistant</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
