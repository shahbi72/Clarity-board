import { expect, test } from '@playwright/test'

test('business dashboard shows bell insights with mocked live-sync data', async ({ page }) => {
  await page.route('**/api/shopify/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        paywalled: false,
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
          topProducts: [
            { productName: 'Classic Tee', sku: 'TEE-1', unitsSold: 20, revenue: 700 },
          ],
          excludedCancelledOrders: 0,
        },
      }),
    })
  })

  await page.route('**/api/business/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        eligible: true,
        reason: 'ok',
        message: null,
        source: {
          connected: true,
          provider: 'GOOGLE_SHEETS',
          spreadsheetName: 'Mock Sheet',
          sheetName: 'Orders',
          lastSyncedAt: '2026-03-01T09:00:00.000Z',
        },
        unreadCount: 1,
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
            type: 'revenue_change',
            title: 'Revenue increased',
            body: 'Up 12.0% vs last sync.',
            severity: 'INFO',
            createdAt: '2026-03-01T09:05:00.000Z',
            readAt: null,
          },
        ],
      }),
    })
  })

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('Business Live Sync')).toBeVisible()
  await expect(page.getByRole('button', { name: /Insights \(1\)/i })).toBeVisible()

  await page.getByRole('button', { name: /Insights \(1\)/i }).click()
  await expect(page.getByText('Revenue increased')).toBeVisible()
})
