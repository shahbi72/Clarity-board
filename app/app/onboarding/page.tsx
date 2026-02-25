'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  COMPANY_SIZE_OPTIONS,
  isCompanySize,
  type CompanySize,
  type UserProfile,
} from '@/lib/profile'
import { isLanguageCode, LANGUAGE_OPTIONS, type LanguageCode } from '@/lib/language'
import { useI18n, useLanguagePreference } from '@/components/language/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ProfileApiResponse = {
  profile: UserProfile
  email: string
  isComplete: boolean
  error?: string
}

type FormState = {
  firstName: string
  lastName: string
  companyName: string
  companySize: CompanySize | ''
  language: LanguageCode
}

const INITIAL_FORM: FormState = {
  firstName: '',
  lastName: '',
  companyName: '',
  companySize: '',
  language: 'en',
}

export default function OnboardingPage() {
  const { t } = useI18n()
  const tOnboarding = React.useCallback((key: string) => t(`onboarding.${key}`), [t])
  const router = useRouter()
  const { setLanguage } = useLanguagePreference()

  const [email, setEmail] = React.useState('')
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/profile', { cache: 'no-store' })
        const payload = (await response.json()) as ProfileApiResponse
        if (!response.ok || payload.error) {
          throw new Error(payload.error ?? tOnboarding('loadError'))
        }

        if (payload.isComplete) {
          router.replace('/app/dashboard')
          return
        }

        setEmail(payload.email ?? '')
        setForm({
          firstName: payload.profile.firstName ?? '',
          lastName: payload.profile.lastName ?? '',
          companyName: payload.profile.companyName ?? '',
          companySize: payload.profile.companySize ?? '',
          language: payload.profile.language ?? 'en',
        })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : tOnboarding('loadError'))
      } finally {
        setIsLoading(false)
      }
    }

    void loadProfile()
  }, [router, tOnboarding])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!form.firstName.trim() || !form.lastName.trim() || !form.companyName.trim()) {
      setError(tOnboarding('requiredFields'))
      return
    }
    if (!isCompanySize(form.companySize)) {
      setError(tOnboarding('companySizeRequired'))
      return
    }
    if (!isLanguageCode(form.language)) {
      setError(tOnboarding('languageRequired'))
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          companyName: form.companyName,
          companySize: form.companySize,
          language: form.language,
        }),
      })
      const payload = (await response.json()) as ProfileApiResponse

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? tOnboarding('saveError'))
      }

      setLanguage(payload.profile.language)
      router.replace('/app/dashboard')
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : tOnboarding('saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{tOnboarding('title')}</CardTitle>
          <CardDescription>
            {tOnboarding('description')}
            {email ? ` ${email}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tOnboarding('loading')}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-first-name">{tOnboarding('firstName')}</Label>
                  <Input
                    id="onboarding-first-name"
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-last-name">{tOnboarding('lastName')}</Label>
                  <Input
                    id="onboarding-last-name"
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="onboarding-company-name">{tOnboarding('companyName')}</Label>
                <Input
                  id="onboarding-company-name"
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, companyName: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{tOnboarding('companySize')}</Label>
                  <Select
                    value={form.companySize}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        companySize: isCompanySize(value) ? value : prev.companySize,
                      }))
                    }
                  >
                    <SelectTrigger data-testid="onboarding-company-size">
                      <SelectValue placeholder={tOnboarding('companySizePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>{tOnboarding('language')}</Label>
                  <Select
                    value={form.language}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        language: isLanguageCode(value) ? value : prev.language,
                      }))
                    }
                  >
                    <SelectTrigger data-testid="onboarding-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full md:w-auto" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tOnboarding('submit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
