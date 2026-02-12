'use client'

import {
  Package,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Suggestion } from '@/lib/mock-data'

interface SuggestionsPanelProps {
  suggestions: Suggestion[]
}

const typeConfig = {
  stock: {
    icon: Package,
    chip: 'icon-chip icon-chip-accent',
  },
  revenue: {
    icon: TrendingUp,
    chip: 'icon-chip icon-chip-primary',
  },
  expense: {
    icon: TrendingDown,
    chip: 'icon-chip icon-chip-muted',
  },
  profit: {
    icon: Sparkles,
    chip: 'icon-chip icon-chip-primary',
  },
}

const impactConfig = {
  high: { label: 'High Impact', variant: 'default' as const },
  medium: { label: 'Medium', variant: 'secondary' as const },
  low: { label: 'Low', variant: 'outline' as const },
}

export function SuggestionsPanel({ suggestions }: SuggestionsPanelProps) {
  return (
    <Card className="border-border/60 bg-card shadow-sm elite-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Suggestions
          </CardTitle>
          <CardDescription>AI-powered recommendations for your business</CardDescription>
        </div>
        <Badge variant="secondary" className="text-xs">
          {suggestions.length} new
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => {
          const type = typeConfig[suggestion.type]
          const impact = impactConfig[suggestion.impact]
          const TypeIcon = type.icon

          return (
            <div
              key={suggestion.id}
              className="group rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-accent/40"
            >
              <div className="flex items-start gap-3">
                <div className={`${type.chip} h-9 w-9`}>
                  <TypeIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-foreground">
                      {suggestion.title}
                    </h4>
                    <Badge variant={impact.variant} className="shrink-0 text-xs">
                      {impact.label}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {suggestion.description}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary"
                  >
                    {suggestion.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
