import { test, expect, type Page } from '@playwright/test'

const unverifiedEmail = process.env.E2E_UNVERIFIED_EMAIL
const unverifiedPassword = process.env.E2E_UNVERIFIED_PASSWORD

const onboardingEmail = process.env.E2E_ONBOARDING_EMAIL
const onboardingPassword = process.env.E2E_ONBOARDING_PASSWORD

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('#sign-in-email').fill(email)
  await page.locator('#sign-in-password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
}

test('signup login is gated behind verify-email when account is unconfirmed', async ({ page }) => {
  test.skip(
    !unverifiedEmail || !unverifiedPassword,
    'Set E2E_UNVERIFIED_EMAIL and E2E_UNVERIFIED_PASSWORD to run this test.'
  )

  await signIn(page, unverifiedEmail as string, unverifiedPassword as string)
  await expect(page).toHaveURL(/\/app\/verify-email$/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: /verify your email/i })).toBeVisible()
})

test('after completing profile onboarding, dashboard loads', async ({ page }) => {
  test.skip(
    !onboardingEmail || !onboardingPassword,
    'Set E2E_ONBOARDING_EMAIL and E2E_ONBOARDING_PASSWORD to run this test.'
  )

  await signIn(page, onboardingEmail as string, onboardingPassword as string)
  await expect(page).toHaveURL(/\/app\/onboarding$/, { timeout: 30_000 })

  await page.locator('#onboarding-first-name').fill('Playwright')
  await page.locator('#onboarding-last-name').fill('Tester')
  await page.locator('#onboarding-company-name').fill('Clarityboard QA')

  await page.getByTestId('onboarding-company-size').click()
  await page.getByRole('option', { name: '11-50' }).click()

  await page.getByTestId('onboarding-language').click()
  await page.getByRole('option', { name: 'English' }).click()

  await page.getByRole('button', { name: /save/i }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 30_000 })
})
