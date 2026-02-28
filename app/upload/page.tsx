'use client'

import { useRouter } from 'next/navigation'
import { ShopifyUploadCard } from '@/components/shopify/shopify-upload-card'

export default function UploadPage() {
  const router = useRouter()

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Upload Shopify Orders CSV</h1>
        <p className="text-sm text-muted-foreground">
          We support only Shopify Orders export. Upload, parse, and view your dashboard instantly.
        </p>
      </section>

      <ShopifyUploadCard
        onUploaded={() => {
          router.push('/dashboard')
        }}
      />
    </main>
  )
}
