import { test, expect } from '@playwright/test'

test('reports auth and dashboard route smoke', async ({ page }) => {
  await page.goto('/reports/dashboard', { waitUntil: 'domcontentloaded' })

  if (process.env.REPORTS_DEMO_AUTH === '1') {
    await expect(page).toHaveURL(/\/reports\/dashboard/, { timeout: 15_000 })
    return
  }

  await expect(page).toHaveURL(/\/reports\/login/, { timeout: 15_000 })
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
})

