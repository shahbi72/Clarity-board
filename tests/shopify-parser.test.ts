import { describe, expect, it } from 'vitest'
import { parseShopifyOrdersCsvText } from '@/lib/server/dataset-parser'

const SHOPIFY_CSV = `Name,Created at,Lineitem quantity,Lineitem name,Lineitem price,Lineitem sku,Lineitem variant,Financial Status,Currency,Refunded Amount,Cancelled at,Lineitem discount,Id
#1001,2026-02-20 10:00:00 +0000,1,Classic Tee,30,TEE-1,Default Title,paid,USD,0,,0,1001
#1001,2026-02-20 10:00:00 +0000,1,Classic Tee,30,TEE-1,Default Title,paid,USD,0,,0,1001
#1002,2026-02-21 10:00:00 +0000,2,Hoodie,50,HOOD-1,XL,partially_refunded,USD,20,,0,1002
#1003,2026-02-22 10:00:00 +0000,1,Cap,25,CAP-1,,paid,EUR,0,2026-02-22 11:00:00 +0000,0,1003`

describe('parseShopifyOrdersCsvText', () => {
  it('accepts only Shopify Orders shape and applies Shopify-specific cleaning', () => {
    const parsed = parseShopifyOrdersCsvText(SHOPIFY_CSV, 'orders.csv')

    expect(parsed.fileType).toBe('SHOPIFY_ORDERS_CSV')
    expect(parsed.rowCount).toBe(3)

    const first = parsed.rows[0]
    expect(first.productName).toBe('Classic Tee')
    expect(first.isCancelled).toBe(false)
    expect(first.lineitemSku).toBe('TEE-1')

    const refunded = parsed.rows[1]
    expect(refunded.productName).toBe('Hoodie - XL')
    expect(refunded.refundedAmountUsd).toBe(20)

    const cancelled = parsed.rows[2]
    expect(cancelled.isCancelled).toBe(true)
    expect(cancelled.lineGrossUsd).toBe(27)
  })
})
