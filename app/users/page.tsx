import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function UsersPage() {
  return (
    <div className="min-h-full">
      <DashboardHeader title="Users" description="Manage user access and workspace roles" />
      <main className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>User management tools will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This page is intentionally lightweight while core data workflows are being finalized.
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
