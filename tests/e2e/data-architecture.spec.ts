import { test, expect } from '@playwright/test'
import path from 'node:path'

const fixturePath = path.join(__dirname, '..', 'fixtures', 'transactions.csv')

test('data pipeline persists and suggestions use active dataset only', async ({ page }) => {
  const consoleErrors: string[] = []
  const resource404s = new Set<string>()

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })
  page.on('response', (response) => {
    if (response.status() === 404) {
      resource404s.add(response.url())
    }
  })

  const datasetName = `QA Dataset ${Date.now()}`

  await page.goto('/upload', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Dataset name').fill(datasetName)
  await page.locator('#dataset-file-input').setInputFiles(fixturePath)
  await page.getByRole('button', { name: /upload dataset/i }).click()

  await expect(page).toHaveURL(/\/datasets(\?.*)?$/)

  const datasetRow = page.locator('tr', { hasText: datasetName }).first()
  await expect(datasetRow).toBeVisible()
  await expect(datasetRow).toContainText('Active')

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No Active Dataset')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: datasetName })).toBeVisible()
  await expect(page.getByText('Recent Transactions')).toBeVisible()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: datasetName })).toBeVisible()

  await page.goto('/suggestions', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(`Active dataset: ${datasetName}`)).toBeVisible()
  await expect(page.getByText('Executive Summary')).toBeVisible()
  await expect(page.locator('#dataset-file-input')).toHaveCount(0)
  await expect(page.getByText('Upload CSV or XLSX')).toHaveCount(0)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText(`Active dataset: ${datasetName}`)).toBeVisible()

  expect(
    consoleErrors,
    `Console errors: ${consoleErrors.join(' | ')} | 404 URLs: ${Array.from(resource404s).join(', ')}`
  ).toEqual([])
})
