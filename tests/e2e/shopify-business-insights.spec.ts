import { expect, test } from '@playwright/test'

test('dashboard sidebar navigation loads all routes and starter sync remains locked', async ({ page }) => {
  await page.route('**/api/shopify/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        paywalled: false,
        plan: 'basic',
        summary: {
          source: 'user',
          datasetName: 'Mock Store',
          rangeDays: 30,
          includeCancelled: false,
          hasData: true,
          currency: 'USD',
          totals: {
            totalRevenue: 1250,
            totalOrders: 45,
            averageOrderValue: 27.78,
            totalUnitsSold: 90,
            totalRefunded: 25,
            estimatedProfit: 500,
          },
          trend: [
            { date: '2026-02-27', revenue: 580 },
            { date: '2026-02-28', revenue: 670 },
          ],
          topProducts: [{ productName: 'Classic Tee', sku: 'TEE-1', unitsSold: 20, revenue: 700 }],
          comparison7d: {
            windowDays: 7,
            current: {
              from: '2026-02-23',
              to: '2026-03-01',
              revenue: 670,
              orders: 23,
              unitsSold: 45,
              refunded: 18,
              averageOrderValue: 29.13,
              refundRate: 0.0269,
              marginPct: 0.31,
            },
            previous: {
              from: '2026-02-16',
              to: '2026-02-22',
              revenue: 590,
              orders: 21,
              unitsSold: 42,
              refunded: 11,
              averageOrderValue: 28.1,
              refundRate: 0.0186,
              marginPct: 0.29,
            },
            deltas: {
              revenuePct: 0.1356,
              ordersPct: 0.0952,
              averageOrderValuePct: 0.0367,
              refundRateDelta: 0.0083,
              refundRateRelative: 0.4462,
              marginDelta: 0.02,
            },
            topSkuDeclines: [],
          },
          excludedCancelledOrders: 0,
          deadStock: {
            lookbackDays: 30,
            items: [],
          },
          salesTiming: {
            bestDay: 'Tuesday',
            bestHour: '7PM',
            ordersByDay: [
              { day: 'Sunday', orders: 2 },
              { day: 'Monday', orders: 4 },
              { day: 'Tuesday', orders: 7 },
              { day: 'Wednesday', orders: 5 },
              { day: 'Thursday', orders: 4 },
              { day: 'Friday', orders: 6 },
              { day: 'Saturday', orders: 3 },
            ],
            ordersByHour: Array.from({ length: 24 }, (_, hour) => ({
              hour,
              label: hour === 19 ? '7PM' : `${hour % 12 === 0 ? 12 : hour % 12}${hour >= 12 ? 'PM' : 'AM'}`,
              orders: hour === 19 ? 9 : 1,
            })),
          },
        },
      }),
    })
  })

  await page.route('**/api/business/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        eligible: false,
        reason: 'plan_upgrade_required',
        message: 'Starter plan does not include sync.',
        source: {
          connected: false,
          provider: 'GOOGLE_SHEETS',
          spreadsheetName: null,
          sheetName: null,
          lastSyncedAt: null,
        },
        unreadCount: 2,
      }),
    })
  })

  await page.route('**/api/business/insights**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        unreadCount: 1,
        items: [
          {
            id: 'evt_1',
            periodKey: '2026-02-23:2026-03-01',
            type: 'revenue_up_7d',
            title: 'Revenue up 13.6% (+$80.00) vs last 7 days',
            body:
              'Primary driver: order volume shift.\nOrders +9.5% and AOV +3.7%.\nSuggested action: scale the winning channel while monitoring margin.',
            severity: 'INFO',
            deltaJson: {
              deltaPct: 0.136,
              deltaValue: 80,
            },
            createdAt: '2026-03-01T09:05:00.000Z',
            readAt: null,
          },
          {
            id: 'evt_2',
            periodKey: '2026-02-23:2026-03-01',
            type: 'orders_drop_7d',
            title: 'Orders down 6.0%',
            body: 'Primary driver: fewer repeat customers.\nSuggested action: launch a win-back campaign.',
            severity: 'WARNING',
            deltaJson: {
              deltaPct: -0.06,
            },
            createdAt: '2026-03-01T09:10:00.000Z',
            readAt: null,
          },
        ],
      }),
    })
  })

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await expect(page.getByText('Top Alerts')).toBeVisible()

  await page.getByRole('link', { name: 'Insights' }).click()
  await expect(page).toHaveURL(/\/dashboard\/insights$/)
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible()
  await expect(page.getByText('What Changed / What Needs Attention')).toBeVisible()

  await page.getByRole('link', { name: 'Products' }).click()
  await expect(page).toHaveURL(/\/dashboard\/products$/)
  await expect(page.getByText('SKU Performance')).toBeVisible()

  await page.getByRole('link', { name: 'Profit Estimator' }).click()
  await expect(page).toHaveURL(/\/dashboard\/profit$/)
  await expect(page.getByText('Profit Inputs')).toBeVisible()

  await page.getByRole('link', { name: 'Revenue Trends' }).click()
  await expect(page).toHaveURL(/\/dashboard\/trends$/)
  await expect(page.getByRole('heading', { name: 'Revenue Trends' })).toBeVisible()

  await page.getByRole('link', { name: 'Sync' }).click()
  await expect(page).toHaveURL(/\/dashboard\/sync$/)
  await expect(page.getByText('Upgrade to Business for Google Sheets Sync')).toBeVisible()

  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page).toHaveURL(/\/dashboard\/settings$/)
  await expect(page.getByText('Notification Preferences')).toBeVisible()
})
