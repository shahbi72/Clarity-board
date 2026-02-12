'use client'

import { Bell, DollarSign, FileText, UserPlus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { NotificationItem } from '@/lib/mock-data'

interface NotificationsPanelProps {
  notifications: NotificationItem[]
}

const typeConfig = {
  payment: {
    icon: DollarSign,
    chip: 'icon-chip icon-chip-primary',
  },
  client: {
    icon: UserPlus,
    chip: 'icon-chip icon-chip-accent',
  },
  alert: {
    icon: Bell,
    chip: 'icon-chip icon-chip-muted',
  },
  document: {
    icon: FileText,
    chip: 'icon-chip icon-chip-muted',
  },
}

export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  return (
    <Card className="border-border/60 bg-card shadow-sm elite-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Latest Notifications
          </CardTitle>
          <CardDescription>Client updates and recent activity</CardDescription>
        </div>
        <Badge variant="secondary" className="text-xs">
          {notifications.length} new
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((item) => {
          const config = typeConfig[item.type]
          const Icon = config.icon
          return (
            <div
              key={item.id}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-start gap-3">
                <div className={`${config.chip} h-9 w-9`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <span className="text-xs text-muted-foreground">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
