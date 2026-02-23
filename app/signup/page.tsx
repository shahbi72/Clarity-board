import { Suspense } from 'react'
import { AuthCard } from '@/components/auth/AuthCard'

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthCard mode="sign-up" />
    </Suspense>
  )
}
