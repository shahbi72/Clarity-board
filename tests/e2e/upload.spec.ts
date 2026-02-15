import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'

const fixturesDir = path.join(__dirname, '..', 'fixtures')
const smallFixturePath = path.join(fixturesDir, 'ecommerce-small-200.csv')
const mediumFixturePath = path.join(fixturesDir, 'ecommerce-medium-20000.csv')
const semicolonFixturePath = path.join(fixturesDir, 'ecommerce-small-200.semicolon.csv')
const tabFixturePath = path.join(fixturesDir, 'ecommerce-small-200.tab.csv')
const currencyCodesFixturePath = path.join(fixturesDir, 'ecommerce-currency-codes.csv')
const largeFixturePath = path.join(fixturesDir, 'ecommerce-large-200000.csv')
const invalidFixturePath = path.join(fixturesDir, 'ecommerce-invalid.csv')

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('csv-file-input')).toBeAttached({ timeout: 15_000 })
  await expect(page.getByTestId('csv-upload-status')).toHaveAttribute('data-state', 'idle')
})

test('uploading a small CSV updates preview, table, and dashboard metrics state', async ({ page }) => {
  await uploadAndExpectState(page, smallFixturePath, 'success')

  await expect(page.getByTestId('csv-preview')).toHaveAttribute('data-state', 'ready')
  await expect(page.getByTestId('csv-data-table')).toHaveAttribute('data-state', 'ready')
  await expect(page.getByTestId('csv-preview-row').first()).toBeVisible()
  await expect(page.getByTestId('csv-data-table-row').first()).toBeVisible()
  await expect(page.getByTestId('dashboard-upload-transactions')).not.toHaveText('0')
})

test('uploading a medium CSV shows progress and completes without UI freeze', async ({ page }) => {
  const input = page.getByTestId('csv-file-input')
  const status = page.getByTestId('csv-upload-status')

  await input.setInputFiles(mediumFixturePath)
  if ((await status.getAttribute('data-state')) === 'idle') {
    await input.setInputFiles(mediumFixturePath)
  }

  await expect(page.getByTestId('csv-upload-progress')).toBeVisible({ timeout: 20_000 })
  await expect(status).toHaveAttribute('data-state', 'success', {
    timeout: 90_000,
  })
  await expect(page.getByTestId('csv-data-table-row').first()).toBeVisible()
  await expect(page.getByTestId('dashboard-upload-transactions')).not.toHaveText('0')
})

test('uploading semicolon-delimited CSV parses successfully', async ({ page }) => {
  await uploadAndExpectState(page, semicolonFixturePath, 'success')

  await expect(page.getByTestId('csv-preview')).toHaveAttribute('data-state', 'ready')
  await expect(page.getByTestId('csv-data-table-row').first()).toBeVisible()
})

test('uploading tab-delimited CSV parses successfully', async ({ page }) => {
  await uploadAndExpectState(page, tabFixturePath, 'success')

  await expect(page.getByTestId('csv-preview')).toHaveAttribute('data-state', 'ready')
  await expect(page.getByTestId('csv-data-table-row').first()).toBeVisible()
})

test('uploading ISO currency code CSV parses amounts and updates dashboard totals', async ({ page }) => {
  await uploadAndExpectState(page, currencyCodesFixturePath, 'success')

  await expect(page.getByTestId('csv-preview')).toHaveAttribute('data-state', 'ready')
  await expect(page.getByTestId('csv-data-table-row').first()).toBeVisible()
  await expect(page.getByTestId('dashboard-upload-transactions')).toHaveText('5')
})

test('uploading oversized CSV shows guardrail error instead of hanging parse', async ({ page }) => {
  await uploadAndExpectState(page, largeFixturePath, 'error')

  await expect(page.getByTestId('csv-preview')).toHaveAttribute('data-state', 'empty')
  await expect(page.getByTestId('csv-data-table')).toHaveAttribute('data-state', 'empty')
  await expect(page.getByTestId('dashboard-upload-transactions')).toHaveText('0')
})

test('uploading invalid CSV keeps clean error and empty states', async ({ page }) => {
  await uploadAndExpectState(page, invalidFixturePath, 'error')

  await expect(page.getByTestId('csv-preview')).toHaveAttribute('data-state', 'empty')
  await expect(page.getByTestId('csv-data-table')).toHaveAttribute('data-state', 'empty')
  await expect(page.getByTestId('csv-data-table-empty')).toBeVisible()
})

async function uploadAndExpectState(page: Page, fixturePath: string, state: 'success' | 'error') {
  const input = page.getByTestId('csv-file-input')
  const status = page.getByTestId('csv-upload-status')

  await input.setInputFiles(fixturePath)
  if ((await status.getAttribute('data-state')) === 'idle') {
    // Hydration race fallback on slower test boot.
    await input.setInputFiles(fixturePath)
  }

  await expect(page.getByTestId('csv-upload-status')).toHaveAttribute('data-state', state, {
    timeout: 45_000,
  })
}
