import { test, expect } from '@playwright/test'

const prodUrl = process.env.PROD_URL?.replace(/\/+$/, '')

function resolvePath(pathname: string): string {
  return prodUrl ? `${prodUrl}${pathname}` : pathname
}

test('home page exposes upload UI essentials', async ({ page }) => {
  await page.goto(resolvePath('/'), { waitUntil: 'domcontentloaded' })

  await expect(page.getByTestId('csv-file-input')).toBeAttached({ timeout: 20_000 })
  await expect(page.getByText('Starter: max 25MB.')).toBeVisible()
})

test('/upload returns upload UI when route exists', async ({ page, request }) => {
  const uploadUrl = resolvePath('/upload')
  const response = await request.get(uploadUrl, { failOnStatusCode: false })

  test.skip(response.status() === 404, '/upload route is not present in target environment')

  expect(response.status()).toBe(200)

  await page.goto(uploadUrl, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('csv-file-input')).toBeAttached({ timeout: 20_000 })
  await expect(page.getByText('Starter: max 25MB.')).toBeVisible()
})
