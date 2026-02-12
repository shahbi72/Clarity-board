import { describe, it, expect } from 'vitest'
import { parseCsvText } from '@/lib/csv'

describe('parseCsvText', () => {
  it('parses a CSV string into transactions', () => {
    const csv = [
      'amount,type,productName,date',
      '1200,revenue,ClarityWidget,2026-02-10',
      '-300,expense,Shipping,2026-02-10',
    ].join('\n')

    const result = parseCsvText(csv)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      amount: 1200,
      type: 'revenue',
      productName: 'ClarityWidget',
      date: '2026-02-10',
    })
    expect(result[1]).toEqual({
      amount: 300,
      type: 'expense',
      productName: 'Shipping',
      date: '2026-02-10',
    })
  })
})
