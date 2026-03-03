'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider'
import { DashboardPageState } from '@/components/dashboard/pages/DashboardPageState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

const CARD_CLASS = 'bg-white rounded-2xl shadow-sm border border-[#d9e1ef]'
const PREFS_STORAGE_KEY = 'clarityboard.dashboard.notificationPrefs'

type NotificationPrefs = {
  revenueDrops: boolean
  newInsights: boolean
  weeklySummary: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  revenueDrops: true,
  newInsights: true,
  weeklySummary: true,
}

export function SettingsPage() {
  const { planType, user } = useDashboardData()
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_PREFS
    }

    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_PREFS
    }

    try {
      const parsed = JSON.parse(raw) as Partial<NotificationPrefs>
      return {
        revenueDrops: Boolean(parsed.revenueDrops),
        newInsights: Boolean(parsed.newInsights),
        weeklySummary: Boolean(parsed.weeklySummary),
      }
    } catch {
      return DEFAULT_PREFS
    }
  })

  useEffect(() => {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  return (
    <DashboardPageState>
      <div className="space-y-6">
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="text-[#1b2540]">Notification Preferences</CardTitle>
            <CardDescription className="text-[#6b7a99]">
              Control which dashboard signals you receive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PreferenceRow
              label="Revenue drops"
              checked={prefs.revenueDrops}
              onChange={(value) =>
                setPrefs((current) => ({
                  ...current,
                  revenueDrops: value,
                }))
              }
            />
            <PreferenceRow
              label="New insights"
              checked={prefs.newInsights}
              onChange={(value) =>
                setPrefs((current) => ({
                  ...current,
                  newInsights: value,
                }))
              }
            />
            <PreferenceRow
              label="Weekly summary"
              checked={prefs.weeklySummary}
              onChange={(value) =>
                setPrefs((current) => ({
                  ...current,
                  weeklySummary: value,
                }))
              }
            />
          </CardContent>
        </Card>

        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="text-[#1b2540]">Billing</CardTitle>
            <CardDescription className="text-[#6b7a99]">
              Current plan and upgrade options.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#1b2540]">
              Current plan:{' '}
              <span className="font-semibold">{planType === 'business' ? 'Business' : 'Starter'}</span>
            </p>
            <Button asChild className="bg-[#4285f4] hover:bg-[#4285f4]/90">
              <Link href="/pricing?upgrade=business">Upgrade</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="text-[#1b2540]">Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#1b2540]">
            <p>
              Email: <span className="font-medium">{user.email || 'Unknown'}</span>
            </p>
            <Button asChild variant="outline" className="border-[#d9e1ef] text-[#1b2540]">
              <Link href="/login">Change password</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardPageState>
  )
}

function PreferenceRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-[#d9e1ef] p-3">
      <span className="text-sm text-[#1b2540]">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
