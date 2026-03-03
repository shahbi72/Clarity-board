'use client'

import { useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import {
  formatDateTime,
  severityBadgeClass,
  useDashboardData,
} from '@/components/dashboard/dashboard-data-provider'
import { DashboardPageState } from '@/components/dashboard/pages/DashboardPageState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBillingActions } from '@/hooks/use-billing-actions'
import { useUserPlan } from '@/hooks/use-user-plan'

const CARD_CLASS = 'bg-white rounded-2xl shadow-sm border border-[#d9e1ef]'

export function SyncPage() {
  const {
    businessStatus,
    businessError,
    loadingBusiness,
    refreshingSheet,
    refreshConnectedSheet,
    pickerOpen,
    setPickerOpen,
    loadSpreadsheets,
    spreadsheets,
    loadSheetTabs,
    selectedSpreadsheet,
    sheetTabs,
    selectSheet,
    insights,
  } = useDashboardData()
  const userPlan = useUserPlan()
  const { openCheckout, checkoutLoading, billingError } = useBillingActions()
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  return (
    <DashboardPageState>
      {!userPlan.isBusiness ? (
        <Card className={`${CARD_CLASS} border-[#f59e0b]/50 bg-[#f59e0b]/10`}>
          <CardHeader>
            <CardTitle className="text-[#1b2540]">Upgrade to Business for Google Sheets Sync</CardTitle>
            <CardDescription className="text-[#6b7a99]">
              Sync is available on Business plan only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="bg-[#4285f4] hover:bg-[#4285f4]/90"
              onClick={() => setUpgradeModalOpen(true)}
            >
              View upgrade options
            </Button>
            {billingError ? <p className="text-sm text-[#ef4444]">{billingError}</p> : null}
          </CardContent>

          <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
            <DialogContent className="max-w-xl bg-white">
              <DialogHeader>
                <DialogTitle className="text-[#1b2540]">Upgrade to Business</DialogTitle>
                <DialogDescription className="text-[#6b7a99]">
                  Unlock Google Sheets sync and live insight notifications.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-2">
                <article className="rounded-xl border border-[#d9e1ef] bg-white p-4">
                  <p className="text-sm font-semibold text-[#1b2540]">Starter</p>
                  <p className="mt-1 text-2xl font-semibold text-[#1b2540]">$25/mo</p>
                  <ul className="mt-3 space-y-1 text-sm text-[#6b7a99]">
                    <li>CSV dashboard analytics</li>
                    <li>AI copilot starter limits</li>
                    <li>No live Google Sheets sync</li>
                  </ul>
                </article>
                <article className="rounded-xl border border-[#4285f4] bg-[#4285f4]/5 p-4">
                  <p className="text-sm font-semibold text-[#1b2540]">Business</p>
                  <p className="mt-1 text-2xl font-semibold text-[#1b2540]">$39/mo</p>
                  <ul className="mt-3 space-y-1 text-sm text-[#6b7a99]">
                    <li>Everything in Starter</li>
                    <li>Google Sheets live sync</li>
                    <li>Unread alert notifications</li>
                  </ul>
                </article>
              </div>

              <DialogFooter>
                <Button
                  className="bg-[#4285f4] text-white hover:bg-[#4285f4]/90"
                  onClick={() => void openCheckout('business')}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Opening checkout...' : 'Upgrade Now'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-[#1b2540]">Google Sheets Sync</CardTitle>
              <CardDescription className="text-[#6b7a99]">
                Connect a sheet and keep your dashboard synced.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingBusiness ? <p className="text-sm text-[#6b7a99]">Loading sync status...</p> : null}
              {businessError ? <p className="text-sm text-[#ef4444]">{businessError}</p> : null}

              {businessStatus?.source.connected ? (
                <div className="rounded-xl border border-[#d9e1ef] p-4">
                  <p className="text-sm font-medium text-[#1b2540]">Connected source</p>
                  <p className="text-sm text-[#6b7a99]">
                    {businessStatus.source.spreadsheetName} / {businessStatus.source.sheetName}
                  </p>
                  <p className="text-sm text-[#6b7a99]">
                    Last sync: {formatDateTime(businessStatus.source.lastSyncedAt)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#6b7a99]">No Google Sheet connected yet.</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button asChild className="bg-[#4285f4] hover:bg-[#4285f4]/90">
                  <a href="/api/business/google/connect">Connect Google Sheets</a>
                </Button>
                <Button
                  variant="outline"
                  className="border-[#d9e1ef] text-[#1b2540]"
                  onClick={() => void refreshConnectedSheet()}
                  disabled={refreshingSheet}
                >
                  {refreshingSheet ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Manual refresh
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="border-[#d9e1ef] text-[#1b2540]"
                  onClick={() => setPickerOpen(!pickerOpen)}
                >
                  {pickerOpen ? 'Hide sheet picker' : 'Open sheet picker'}
                </Button>
              </div>

              {pickerOpen ? (
                <div className="space-y-3 rounded-xl border border-[#d9e1ef] p-3">
                  <Button
                    variant="outline"
                    className="border-[#d9e1ef] text-[#1b2540]"
                    onClick={() => void loadSpreadsheets()}
                  >
                    Load spreadsheets
                  </Button>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      {spreadsheets.map((sheet) => (
                        <button
                          key={sheet.id}
                          type="button"
                          className="w-full rounded-lg border border-[#d9e1ef] p-2 text-left text-sm text-[#1b2540]"
                          onClick={() => void loadSheetTabs(sheet)}
                        >
                          {sheet.name}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {selectedSpreadsheet ? (
                        <p className="text-xs text-[#6b7a99]">{selectedSpreadsheet.name}</p>
                      ) : null}
                      {sheetTabs.map((tab) => (
                        <div key={tab.name} className="rounded-lg border border-[#d9e1ef] p-2">
                          <p className="text-sm text-[#1b2540]">{tab.name}</p>
                          <Button
                            size="sm"
                            className="mt-2 bg-[#4285f4] hover:bg-[#4285f4]/90"
                            onClick={() => void selectSheet(tab.name)}
                          >
                            Use this sheet
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-[#1b2540]">Sync Log</CardTitle>
              <CardDescription className="text-[#6b7a99]">Last 10 sync-related events.</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <p className="text-sm text-[#6b7a99]">No sync events yet.</p>
              ) : (
                <div className="space-y-2">
                  {insights.slice(0, 10).map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#d9e1ef] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[#1b2540]">{item.title}</p>
                        <span className={severityBadgeClass(item.severity)}>{item.severity}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#6b7a99]">{formatDateTime(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardPageState>
  )
}
