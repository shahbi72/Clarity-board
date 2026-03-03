'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider'
import { DashboardPageState } from '@/components/dashboard/pages/DashboardPageState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useBillingActions } from '@/hooks/use-billing-actions'
import { useUserPlan } from '@/hooks/use-user-plan'

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
  const { user } = useDashboardData()
  const userPlan = useUserPlan()
  const { openCheckout, openPortal, checkoutLoading, portalLoading, billingError } = useBillingActions()
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
          <CardContent className="space-y-3">
            <p className="text-sm text-[#1b2540]">
              Current plan:{' '}
              <span className="font-semibold">
                {userPlan.isBusiness ? 'Business' : userPlan.plan === 'free' ? 'Free' : 'Starter'}
              </span>
            </p>
            {userPlan.isTrial ? (
              <p className="text-sm text-[#6b7a99]">
                Trial days remaining: <span className="font-semibold text-[#1b2540]">{userPlan.trialDaysLeft}</span>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-[#4285f4] hover:bg-[#4285f4]/90"
                onClick={() => void openCheckout('business')}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? 'Opening checkout...' : 'Upgrade to Business'}
              </Button>
              <Button
                variant="outline"
                className="border-[#d9e1ef] text-[#1b2540]"
                onClick={() => void openPortal()}
                disabled={portalLoading}
              >
                {portalLoading ? 'Opening portal...' : 'Manage Subscription'}
              </Button>
            </div>
            {billingError ? <p className="text-sm text-[#ef4444]">{billingError}</p> : null}
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
