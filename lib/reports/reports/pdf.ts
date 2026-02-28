import PDFDocument from 'pdfkit'
import type { DashboardMetrics } from '@/lib/reports/kpi/metrics'

type ReportPdfInput = {
  workspaceName: string
  datasetName: string
  generatedAt: Date
  metrics: DashboardMetrics
}

export async function generateWeeklyReportPdf(input: ReportPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(10).fillColor('#64748b').text('Clarityboard Reports', { align: 'right' })
    doc.moveDown(0.5)

    doc.fontSize(22).fillColor('#0f172a').text('Weekly KPI Report')
    doc.moveDown(0.3)
    doc.fontSize(12).fillColor('#334155').text(input.workspaceName)
    doc.fontSize(11).fillColor('#475569').text(`Dataset: ${input.datasetName}`)
    doc.text(`Generated: ${input.generatedAt.toISOString()}`)

    doc.moveDown(1.2)
    doc.fontSize(14).fillColor('#0f172a').text('KPI Totals')
    doc.moveDown(0.4)

    const totals = input.metrics.totals
    const rows = [
      ['Revenue', totals.revenue.toFixed(2)],
      ['Cost', totals.cost.toFixed(2)],
      ['Profit', totals.profit.toFixed(2)],
      ['Orders', totals.orders.toFixed(2)],
      ['Avg Conversion Rate', totals.conversionRate !== null ? totals.conversionRate.toFixed(4) : 'N/A'],
    ]

    rows.forEach(([label, value]) => {
      doc.fontSize(11).fillColor('#0f172a').text(label, 52, doc.y, { continued: true, width: 300 })
      doc.fillColor('#111827').text(value, { align: 'right' })
      doc.moveDown(0.3)
    })

    doc.moveDown(0.8)
    doc.fontSize(14).fillColor('#0f172a').text('Trend (Date, Revenue, Cost, Profit, Orders)')
    doc.moveDown(0.5)

    input.metrics.trend.slice(-14).forEach((point) => {
      doc
        .fontSize(10)
        .fillColor('#1e293b')
        .text(
          `${point.date} | ${point.revenue.toFixed(2)} | ${point.cost.toFixed(2)} | ${point.profit.toFixed(2)} | ${point.orders.toFixed(2)}`
        )
    })

    doc.moveDown(1)
    doc.fontSize(9).fillColor('#64748b').text('Generated automatically by Clarityboard Reports.', {
      align: 'center',
    })

    doc.end()
  })
}

