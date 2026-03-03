import { expect, test } from '@playwright/test'

test('landing page is Shopify-focused', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: /upload your shopify orders export/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /upload shopify orders csv/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /try demo data/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /start free trial/i }).first()).toBeVisible()
})

test('dashboard overview route loads shell layout', async ({ page }) => {
  await page.goto('/dashboard?demo=1', { waitUntil: 'domcontentloaded' })

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
})
