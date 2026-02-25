'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { useI18n, useLanguagePreference } from '@/components/language/language-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LANGUAGE_OPTIONS, isLanguageCode, type LanguageCode } from '@/lib/language'
import { COMPANY_SIZE_OPTIONS, isCompanySize, type CompanySize, type UserProfile } from '@/lib/profile'

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

export default function SettingsPage() {
  const { t } = useI18n()
  const tSettings = React.useCallback((key: string) => t(`settings.${key}`), [t])
  const { setLanguage } = useLanguagePreference()

  const [email, setEmail] = React.useState('')
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true)
      setError(null)
      setSuccess(null)

      try {
        const response = await fetch('/api/profile', { cache: 'no-store' })
        const payload = (await response.json()) as ProfileApiResponse

        if (!response.ok || payload.error) {
          throw new Error(payload.error ?? tSettings('loadError'))
        }

        setEmail(payload.email)
        setForm({
          firstName: payload.profile.firstName,
          lastName: payload.profile.lastName,
          companyName: payload.profile.companyName,
          companySize: payload.profile.companySize,
          language: payload.profile.language,
        })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : tSettings('loadError'))
      } finally {
        setIsLoading(false)
      }
    }

    void loadProfile()
  }, [tSettings])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.firstName.trim() || !form.lastName.trim() || !form.companyName.trim()) {
      setError(tSettings('requiredFields'))
      return
    }
    if (!isCompanySize(form.companySize)) {
      setError(tSettings('companySizeRequired'))
      return
    }
    if (!isLanguageCode(form.language)) {
      setError(tSettings('languageRequired'))
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error(payload.error ?? tSettings('saveError'))
      }

      setLanguage(payload.profile.language)
      setSuccess(tSettings('saveSuccess'))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : tSettings('saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-full">
      <DashboardHeader title={tSettings('pageTitle')} description={tSettings('pageDescription')} />
      <main className="flex-1 p-4 md:p-6">
        <Card className="mx-auto w-full max-w-3xl">
          <CardHeader>
            <CardTitle>{tSettings('profileTitle')}</CardTitle>
            <CardDescription>{tSettings('profileDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tSettings('loading')}
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSave}>
                {error ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
                {success ? (
                  <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
                    {success}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-first-name">{tSettings('firstName')}</Label>
                    <Input
                      id="settings-first-name"
                      value={form.firstName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, firstName: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-last-name">{tSettings('lastName')}</Label>
                    <Input
                      id="settings-last-name"
                      value={form.lastName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, lastName: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="settings-email">{tSettings('email')}</Label>
                  <Input id="settings-email" value={email} readOnly disabled />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="settings-company-name">{tSettings('companyName')}</Label>
                  <Input
                    id="settings-company-name"
                    value={form.companyName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, companyName: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{tSettings('companySize')}</Label>
                    <Select
                      value={form.companySize}
                      onValueChange={(value) => {
                        setForm((prev) => ({
                          ...prev,
                          companySize: isCompanySize(value) ? value : prev.companySize,
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={tSettings('companySizePlaceholder')} />
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
                    <Label>{tSettings('language')}</Label>
                    <Select
                      value={form.language}
                      onValueChange={(value) => {
                        if (!isLanguageCode(value)) return
                        setForm((prev) => ({ ...prev, language: value }))
                        setLanguage(value)
                      }}
                    >
                      <SelectTrigger>
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

                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {tSettings('save')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
