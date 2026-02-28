import { expect, test } from '@playwright/test'

test('landing page is Shopify-focused', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: /upload your shopify orders export/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /upload shopify orders csv/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /try demo data/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /start free trial/i }).first()).toBeVisible()
})

test('demo dashboard renders KPI essentials without auth', async ({ page }) => {
  await page.goto('/dashboard?demo=1', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: /shopify orders dashboard/i })).toBeVisible()
  await expect(page.getByText('Total Revenue')).toBeVisible()
  await expect(page.getByText('Total Orders')).toBeVisible()
  await expect(page.getByText('AOV')).toBeVisible()
  await expect(page.getByText('Units Sold').first()).toBeVisible()
  await expect(page.getByText('Top 5 Products by Revenue')).toBeVisible()
})
