'use client'

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { AIChat } from '@/components/assistant/ai-chat'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  TrendingUp,
  Package,
  DollarSign,
  Zap,
} from 'lucide-react'

const capabilities = [
  {
    icon: TrendingUp,
    title: 'Sales Analysis',
    description: 'Get insights on your revenue trends and growth opportunities',
  },
  {
    icon: Package,
    title: 'Inventory Insights',
    description: 'Identify low-stock items and optimize reorder points',
  },
  {
    icon: DollarSign,
    title: 'Profit Optimization',
    description: 'Find underperforming products and margin improvement ideas',
  },
  {
    icon: MessageSquare,
    title: 'Natural Language',
    description: 'Ask questions in plain English about your business',
  },
]

export default function AssistantPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader
          title="AI Assistant"
          description="Get intelligent insights about your business data"
        />
        <main className="flex-1 p-4 md:p-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chat Panel */}
            <div className="lg:col-span-2">
              <AIChat />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Capabilities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="h-4 w-4 text-primary" />
                    What I Can Do
                  </CardTitle>
                  <CardDescription>
                    Powered by AI to help you make better decisions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {capabilities.map((capability) => (
                    <div key={capability.title} className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <capability.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {capability.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {capability.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Data Sources */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Connected Data</CardTitle>
                  <CardDescription>
                    The assistant analyzes these datasets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Q4 Sales Report</p>
                      <p className="text-xs text-muted-foreground">15,420 records</p>
                    </div>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Inventory Snapshot</p>
                      <p className="text-xs text-muted-foreground">3,250 records</p>
                    </div>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
