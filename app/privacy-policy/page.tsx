'use client'

import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export default function PrivacyPolicyPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader
          title="Privacy Policy"
          description="How Clarityboard collects and protects your data."
        />
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Legal
            </p>
            <p className="text-sm text-muted-foreground">Effective February 10, 2026</p>
          </div>

          <Card className="border-border/60 bg-card shadow-sm elite-card">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                This Privacy Policy explains how Clarityboard collects, uses, and
                protects your information when you use our product. It is a template
                and should be customized to match your business practices.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-sm elite-card">
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                We collect account details, uploaded files, usage analytics, and
                technical data needed to operate the service. This may include
                billing details, transaction metadata, and support conversations.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-sm elite-card">
            <CardHeader>
              <CardTitle>How We Use Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                We use data to provide dashboards, process uploads, deliver AI
                insights, improve reliability, and communicate important product
                updates.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-sm elite-card">
            <CardHeader>
              <CardTitle>Sharing and Retention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                We do not sell your data. We share information only with trusted
                service providers that help us operate the platform. Data is retained
                only as long as needed to provide the service and meet legal
                obligations.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-sm elite-card">
            <CardHeader>
              <CardTitle>Your Choices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                You can request access, export, or deletion of your data. Contact
                support to update your preferences or close your account.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-sm elite-card">
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                For privacy questions, reach out to privacy@clarityboard.com or your
                account manager.
              </p>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
