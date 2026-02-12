import { test, expect } from '@playwright/test'
import path from 'node:path'

const fixturePath = path.join(__dirname, '..', 'fixtures', 'transactions.csv')

test('uploading a CSV updates the dashboard', async ({ page }) => {
  await page.goto('/')

  await page.setInputFiles('input[type="file"]', fixturePath)

  await expect(page.getByRole('cell', { name: 'ClarityWidget' }).first()).toBeVisible()
  await expect(page.locator('text=$1,200.00').first()).toBeVisible()
})
