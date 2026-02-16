import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function FeaturesPage() {
  return (
    <div className="min-h-full">
      <DashboardHeader title="Features" description="Browse feature modules and roadmap status" />
      <main className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>Feature-level configuration and docs will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This placeholder route prevents broken navigation and prefetch 404s.
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
