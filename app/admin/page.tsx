import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAdminPageAccess } from '@/lib/server/admin'
import { listAdminUsers } from '@/lib/server/admin-users'
import { getErrorMessage } from '@/lib/server/http-error'

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function AdminPage() {
  await requireAdminPageAccess('/dashboard')

  let users: Awaited<ReturnType<typeof listAdminUsers>> = []
  let usersError: string | null = null

  try {
    users = await listAdminUsers()
  } catch (error) {
    users = []
    usersError = getErrorMessage(error)
  }

  return (
    <div className="min-h-full">
      <DashboardHeader title="Admin" description="Workspace user directory and roles" />
      <main className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Read-only user listing for administrators.</CardDescription>
          </CardHeader>
          <CardContent>
            {usersError ? (
              <p className="text-sm text-destructive">{usersError}</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="px-2 py-2 font-medium">User ID</th>
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">Company</th>
                      <th className="px-2 py-2 font-medium">Role</th>
                      <th className="px-2 py-2 font-medium">Language</th>
                      <th className="px-2 py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const fullName =
                        [user.firstName, user.lastName].filter((part) => Boolean(part?.trim())).join(' ') ||
                        'Not provided'
                      return (
                        <tr key={user.userId} className="border-b border-border/60 align-top">
                          <td className="px-2 py-2 font-mono text-xs">{user.userId}</td>
                          <td className="px-2 py-2">{fullName}</td>
                          <td className="px-2 py-2">{user.companyName ?? 'Not provided'}</td>
                          <td className="px-2 py-2 capitalize">{user.role}</td>
                          <td className="px-2 py-2 uppercase">{user.language ?? 'n/a'}</td>
                          <td className="px-2 py-2">{formatDate(user.createdAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
