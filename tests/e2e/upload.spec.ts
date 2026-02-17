import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'

const fixturePath = path.join(__dirname, '..', 'fixtures', 'transactions.csv')

test('upload flow persists active dataset across dashboard and suggestions refresh', async ({ page }) => {
  const datasetName = `E2E Dataset ${Date.now()}`

  await uploadDataset(page, datasetName, fixturePath)

  const datasetRow = page.locator('tr', { hasText: datasetName }).first()
  await expect(datasetRow).toBeVisible()
  await expect(datasetRow).toContainText('Active')

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: datasetName })).toBeVisible()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: datasetName })).toBeVisible()

  await page.goto('/suggestions', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(`Active dataset: ${datasetName}`)).toBeVisible()
  await expect(page.getByRole('link', { name: /^Go to Datasets$/i })).toHaveCount(0)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText(`Active dataset: ${datasetName}`)).toBeVisible()
})

test('activating a different dataset updates dashboard and suggestions to the new active dataset', async ({
  page,
}) => {
  const firstDatasetName = `E2E First ${Date.now()}`
  const secondDatasetName = `E2E Second ${Date.now()}`

  await uploadDataset(page, firstDatasetName, fixturePath)
  await uploadDataset(page, secondDatasetName, fixturePath)

  const firstDatasetRow = page.locator('tr', { hasText: firstDatasetName }).first()
  await expect(firstDatasetRow).toBeVisible()
  await firstDatasetRow.getByRole('button', { name: /^Activate$/i }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: firstDatasetName })).toBeVisible()

  await page.goto('/suggestions', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(`Active dataset: ${firstDatasetName}`)).toBeVisible()
})

async function uploadDataset(page: Page, datasetName: string, fixture: string) {
  await page.goto('/upload', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#dataset-file-input')).toBeAttached({ timeout: 15_000 })

  await page.getByLabel('Dataset name').fill(datasetName)
  await page.locator('#dataset-file-input').setInputFiles(fixture)
  await page.getByRole('button', { name: /upload dataset/i }).click()

  await expect(page).toHaveURL(/\/datasets(\?.*)?$/, {
    timeout: 45_000,
  })
}
