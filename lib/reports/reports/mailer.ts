import { Resend } from 'resend'
import { logger } from '@/lib/reports/server/logger'

type SendReportEmailInput = {
  to: string
  subject: string
  html: string
  pdf: Buffer
  pdfFilename: string
}

type SendReportEmailResult = {
  provider: 'resend' | 'noop'
  externalId: string | null
}

function getFromEmail(): string {
  return process.env.REPORTS_FROM_EMAIL?.trim() || 'Clarityboard Reports <reports@clarityboard.app>'
}

export async function sendReportEmail(input: SendReportEmailInput): Promise<SendReportEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()

  if (!apiKey) {
    logger.warn('RESEND_API_KEY is missing. Skipping outbound email send.', {
      recipient: input.to,
      subject: input.subject,
    })
    return {
      provider: 'noop',
      externalId: null,
    }
  }

  const resend = new Resend(apiKey)
  const result = await resend.emails.send({
    from: getFromEmail(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: [
      {
        filename: input.pdfFilename,
        content: input.pdf,
      },
    ],
  })

  return {
    provider: 'resend',
    externalId: result.data?.id ?? null,
  }
}

