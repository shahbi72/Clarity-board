import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseCsvText, parseCsvTextDetailed, parseRowsMatrix } from '@/lib/csv'

describe('parseCsvText', () => {
  it('parses a standard header CSV into transactions', () => {
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

  it('detects semicolon delimiter and trims empty rows', () => {
    const csv = [
      'amount;type;productName;date',
      '$1,200.50;revenue;Subscriptions;02/10/2026',
      '',
      '(300);expense;Shipping;10/02/2026',
      '',
    ].join('\n')

    const result = parseCsvTextDetailed(csv)

    expect(result.meta.delimiter).toBe(';')
    expect(result.txs).toHaveLength(2)
    expect(result.txs[0]).toEqual({
      amount: 1200.5,
      type: 'revenue',
      productName: 'Subscriptions',
      date: '2026-02-10',
    })
    expect(result.txs[1]).toEqual({
      amount: 300,
      type: 'expense',
      productName: 'Shipping',
      date: '2026-10-02',
    })
  })

  it('supports quoted fields with commas and newlines', () => {
    const csv = [
      'amount,type,productName,date',
      '"1200","revenue","Starter, Plan","2026-02-10"',
      '"450","expense","Shipping',
      'International","2026-02-11"',
    ].join('\n')

    const result = parseCsvText(csv)

    expect(result).toHaveLength(2)
    expect(result[0].productName).toBe('Starter, Plan')
    expect(result[1].productName).toBe('Shipping\nInternational')
  })

  it('parses international currency symbols used by global stores', () => {
    const csv = [
      'amount;type;productName;date',
      '\u20ac1.234,56;revenue;EU Sale;2026-02-12',
      '\u00a31,234.56;revenue;UK Sale;2026-02-12',
      '(\u00a5799.50);expense;JP Return;2026-02-12',
      '-\u20b91,000.00;expense;IN Fee;2026-02-12',
    ].join('\n')

    const result = parseCsvTextDetailed(csv)

    expect(result.meta.delimiter).toBe(';')
    expect(result.txs).toEqual([
      { amount: 1234.56, type: 'revenue', productName: 'EU Sale', date: '2026-02-12' },
      { amount: 1234.56, type: 'revenue', productName: 'UK Sale', date: '2026-02-12' },
      { amount: 799.5, type: 'expense', productName: 'JP Return', date: '2026-02-12' },
      { amount: 1000, type: 'expense', productName: 'IN Fee', date: '2026-02-12' },
    ])
  })

  it('parses amount values prefixed with ISO currency codes', () => {
    const csv = [
      'amount;type;productName;date',
      'USD 1,250.00;revenue;North America Order;2026-02-10',
      '(GBP 120.50);expense;Chargeback;2026-02-11',
      'JPY 1500;expense;Logistics Fee;2026-02-11',
    ].join('\n')

    const result = parseCsvTextDetailed(csv)

    expect(result.txs).toEqual([
      { amount: 1250, type: 'revenue', productName: 'North America Order', date: '2026-02-10' },
      { amount: 120.5, type: 'expense', productName: 'Chargeback', date: '2026-02-11' },
      { amount: 1500, type: 'expense', productName: 'Logistics Fee', date: '2026-02-11' },
    ])
  })

  it('pads short rows and skips rows without parseable amount values', () => {
    const csv = [
      'amount,type,productName,date',
      '1200,revenue,Pro Plan,2026-02-10',
      '300,expense',
      ',expense,Missing Amount,2026-02-11',
    ].join('\n')

    const result = parseCsvTextDetailed(csv)

    expect(result.meta.normalizedRows).toBe(1)
    expect(result.meta.totalRows).toBe(3)
    expect(result.meta.skippedRows).toBe(1)
    expect(result.txs).toEqual([
      {
        amount: 1200,
        type: 'revenue',
        productName: 'Pro Plan',
        date: '2026-02-10',
      },
      {
        amount: 300,
        type: 'expense',
        productName: undefined,
        date: undefined,
      },
    ])
  })

  it('parses no-header rows with currency values, negatives, and inferred dates', () => {
    const csv = [
      'Widget A,"$1,250.00",credit,2/1/2026',
      'Returns,($300.50),debit,15/02/2026',
      'Service Fee,$25.00,expense,2026-02-03',
    ].join('\n')

    const result = parseCsvTextDetailed(csv)

    expect(result.meta.headerDetected).toBe(false)
    expect(result.txs).toEqual([
      {
        amount: 1250,
        type: 'revenue',
        productName: 'Widget A',
        date: '2026-02-01',
      },
      {
        amount: 300.5,
        type: 'expense',
        productName: 'Returns',
        date: '2026-02-15',
      },
      {
        amount: 25,
        type: 'expense',
        productName: 'Service Fee',
        date: '2026-02-03',
      },
    ])
  })

  it('counts ambiguous day/month values in metadata', () => {
    const csv = [
      'amount,type,productName,date',
      '120,revenue,Alpha,02/03/2026',
      '200,revenue,Beta,11/12/2026',
      '90,expense,Fees,20/02/2026',
    ].join('\n')

    const result = parseCsvTextDetailed(csv)

    expect(result.meta.ambiguousDateRows).toBe(2)
    expect(result.txs[0]?.date).toBe('2026-02-03')
    expect(result.txs[1]?.date).toBe('2026-11-12')
    expect(result.txs[2]?.date).toBe('2026-02-20')
  })

  it('parses generated semicolon and tab fixtures', () => {
    const semicolonFixture = fs.readFileSync(
      path.resolve(process.cwd(), 'tests', 'fixtures', 'ecommerce-small-200.semicolon.csv'),
      'utf8'
    )
    const tabFixture = fs.readFileSync(
      path.resolve(process.cwd(), 'tests', 'fixtures', 'ecommerce-small-200.tab.csv'),
      'utf8'
    )

    const semicolonResult = parseCsvTextDetailed(semicolonFixture)
    const tabResult = parseCsvTextDetailed(tabFixture)

    expect(semicolonResult.meta.delimiter).toBe(';')
    expect(tabResult.meta.delimiter).toBe('\t')
    expect(semicolonResult.txs.length).toBeGreaterThan(150)
    expect(tabResult.txs.length).toBeGreaterThan(150)
  })

  it('handles large row matrices with stable normalization counts', () => {
    const rows: string[][] = [['amount', 'type', 'productName', 'date']]
    for (let index = 0; index < 50_000; index += 1) {
      rows.push([
        String((index % 1200) + 20),
        index % 5 === 0 ? 'expense' : 'revenue',
        `Product-${index}`,
        '2026-02-10',
      ])
    }

    const result = parseRowsMatrix(rows, { delimiter: ',' })

    expect(result.txs).toHaveLength(50_000)
    expect(result.meta.skippedRows).toBe(0)
    expect(result.meta.normalizedRows).toBe(0)
    expect(result.meta.parseErrors).toBe(0)
  })

  it('surfaces parser warnings for invalid csv fixture without leaking valid rows', () => {
    const invalidFixture = fs.readFileSync(
      path.resolve(process.cwd(), 'tests', 'fixtures', 'ecommerce-invalid.csv'),
      'utf8'
    )
    const result = parseCsvTextDetailed(invalidFixture)

    expect(result.meta.parseErrors).toBeGreaterThan(0)
    expect(result.txs).toHaveLength(0)
  })
})
