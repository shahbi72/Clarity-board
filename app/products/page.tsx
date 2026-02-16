import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProductsPage() {
  return (
    <div className="min-h-full">
      <DashboardHeader title="Products" description="Track product catalog and performance" />
      <main className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>Product analytics and management will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This placeholder route prevents broken navigation and prefetch 404s.
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
