import { prisma } from '@/lib/server/prisma'
import { ApiError } from '@/lib/reports/server/api-error'
import type { CleanRow } from '@/lib/reports/cleaning/engine'
import { getBillingGate } from '@/lib/reports/server/tenancy'
import { computeDashboardMetrics } from '@/lib/reports/kpi/metrics'
import { generateWeeklyReportPdf } from '@/lib/reports/reports/pdf'
import { sendReportEmail } from '@/lib/reports/reports/mailer'
import { writeAuditLog } from '@/lib/reports/server/audit'
import { logger } from '@/lib/reports/server/logger'
import { computeNextWeeklyRun } from '@/lib/reports/scheduling'

export async function sendReportForSchedule(params: {
  workspaceId: string
  userId: string
  sheetSourceId?: string | null
  recipientEmail?: string | null
  scheduledFor?: Date
  reportType?: 'WEEKLY' | 'MANUAL'
}): Promise<{ reportId: string; sent: boolean }> {
  const gate = await getBillingGate(params.userId)

  if (!gate.allowed) {
    throw new ApiError(402, 'subscription_required', 'Trial expired or subscription inactive.')
  }

  const source = params.sheetSourceId
    ? await prisma.sheetSource.findFirst({
        where: {
          id: params.sheetSourceId,
          workspaceId: params.workspaceId,
          userId: params.userId,
        },
        include: {
          dataset: true,
          workspace: true,
        },
      })
    : await prisma.sheetSource.findFirst({
        where: {
          workspaceId: params.workspaceId,
          userId: params.userId,
          isActive: true,
          datasetId: { not: null },
        },
        include: {
          dataset: true,
          workspace: true,
        },
        orderBy: { updatedAt: 'desc' },
      })

  if (!source?.datasetId || !source.dataset) {
    throw new ApiError(404, 'dataset_missing', 'No synced dataset available for report generation.')
  }

  const [cleanTable, mapping, user] = await Promise.all([
    prisma.cleanTable.findUnique({ where: { datasetId: source.datasetId } }),
    prisma.kpiMapping.findUnique({ where: { datasetId: source.datasetId } }),
    prisma.user.findUnique({ where: { id: params.userId }, select: { email: true } }),
  ])

  if (!cleanTable || !mapping) {
    throw new ApiError(400, 'dataset_not_ready', 'Dataset cleaning or KPI mapping is not ready yet.')
  }

  const rows = (Array.isArray(cleanTable.rowsJson) ? cleanTable.rowsJson : []) as CleanRow[]
  const metrics = computeDashboardMetrics({
    rows,
    mapping: {
      dateColumn: mapping.dateColumn,
      revenueColumn: mapping.revenueColumn,
      costColumn: mapping.costColumn,
      ordersColumn: mapping.ordersColumn,
      profitColumn: mapping.profitColumn,
      conversionRateColumn: mapping.conversionRateColumn,
      confidence: (mapping.inferenceConfidence as Record<string, number>) ?? {},
      derivedProfit: !mapping.profitColumn && Boolean(mapping.revenueColumn && mapping.costColumn),
    },
  })

  const recipient = params.recipientEmail ?? source.workspace.defaultReportEmail ?? user?.email ?? null
  if (!recipient) {
    throw new ApiError(400, 'report_recipient_missing', 'No recipient email configured for report delivery.')
  }

  const report = await prisma.report.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      datasetId: source.datasetId,
      sheetSourceId: source.id,
      status: 'PENDING',
      reportType: params.reportType ?? 'WEEKLY',
      scheduledFor: params.scheduledFor ?? null,
      recipientEmail: recipient,
      subject: `Weekly KPI Report - ${source.dataset.name}`,
      kpiSnapshot: metrics,
    },
  })

  try {
    const pdf = await generateWeeklyReportPdf({
      workspaceName: source.workspace.name,
      datasetName: source.dataset.name,
      generatedAt: new Date(),
      metrics,
    })

    const sendResult = await sendReportEmail({
      to: recipient,
      subject: report.subject,
      html: `<p>Your weekly KPI report for <strong>${source.dataset.name}</strong> is attached.</p>`,
      pdf,
      pdfFilename: `clarityboard-report-${new Date().toISOString().slice(0, 10)}.pdf`,
    })

    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        pdfStoragePath: sendResult.externalId ? `resend:${sendResult.externalId}` : null,
      },
    })

    await writeAuditLog({
      workspaceId: params.workspaceId,
      userId: params.userId,
      action: 'report.sent',
      resourceType: 'report',
      resourceId: report.id,
      metadata: {
        recipient,
        provider: sendResult.provider,
      },
    })

    return { reportId: report.id, sent: true }
  } catch (error) {
    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'unknown_error',
      },
    })

    logger.error('Report send failed', {
      reportId: report.id,
      workspaceId: params.workspaceId,
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    throw error
  }
}

export async function runDueSchedules(now: Date = new Date()): Promise<{
  processed: number
  sent: number
  failed: number
  skipped: number
}> {
  const due = await prisma.reportSchedule.findMany({
    where: {
      enabled: true,
      nextRunAt: {
        lte: now,
      },
    },
    orderBy: { nextRunAt: 'asc' },
  })

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const schedule of due) {
    try {
      const gate = await getBillingGate(schedule.userId)
      if (!gate.allowed) {
        const nextRunAt = computeNextWeeklyRun(
          {
            dayOfWeek: schedule.dayOfWeek,
            timeOfDay: schedule.timeOfDay,
            timezone: schedule.timezone,
          },
          now
        )

        await prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: {
            nextRunAt,
          },
        })

        skipped += 1
        continue
      }

      await sendReportForSchedule({
        workspaceId: schedule.workspaceId,
        userId: schedule.userId,
        sheetSourceId: schedule.sheetSourceId,
        recipientEmail: schedule.recipientEmail,
        scheduledFor: schedule.nextRunAt ?? undefined,
        reportType: 'WEEKLY',
      })

      const nextRunAt = computeNextWeeklyRun({
        dayOfWeek: schedule.dayOfWeek,
        timeOfDay: schedule.timeOfDay,
        timezone: schedule.timezone,
      }, now)

      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          nextRunAt,
        },
      })

      sent += 1
    } catch {
      failed += 1
    }
  }

  return {
    processed: due.length,
    sent,
    failed,
    skipped,
  }
}

