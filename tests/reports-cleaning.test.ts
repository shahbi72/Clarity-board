import { describe, expect, it } from 'vitest'
import { cleanSheetRows } from '@/lib/reports/cleaning/engine'

describe('cleanSheetRows', () => {
  it('normalizes headers, parses numbers and dates, and removes duplicates/empty rows', () => {
    const result = cleanSheetRows([
      ['ignore', '', ''],
      ['  Date ', ' Revenue $ ', 'Orders'],
      ['01/20/2026', '$1,200.50', '10'],
      ['01/20/2026', '$1,200.50', '10'],
      ['2026-01-21', ' 2,100 ', '12'],
      ['', '', ''],
    ])

    expect(result.headerRowIndex).toBe(1)
    expect(result.headers).toEqual(['date', 'revenue', 'orders'])
    expect(result.cleanedRows).toHaveLength(2)
    expect(result.duplicateRowCount).toBe(1)

    expect(result.cleanedRows[0]).toEqual({
      date: '2026-01-20',
      revenue: 1200.5,
      orders: 10,
    })

    expect(result.cleanedRows[1]).toEqual({
      date: '2026-01-21',
      revenue: 2100,
      orders: 12,
    })

    expect(result.columnProfiles.revenue.type).toBe('number')
    expect(result.columnProfiles.date.type).toBe('date')
  })
})

