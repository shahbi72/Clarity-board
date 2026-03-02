export type ProfitEstimatorProductInput = {
  key: string
  productName: string
  unitsSold: number
  revenue: number
}

export type ProfitEstimatorConfig = {
  grossRevenue: number
  refunded: number
  totalOrders: number
  totalUnitsSold: number
  feePercent: number
  fixedFeePerOrder: number
  avgShippingPerOrder: number
  productCosts: Record<string, number>
  products: ProfitEstimatorProductInput[]
}

export type ProductProfitEstimate = {
  key: string
  productName: string
  unitsSold: number
  revenue: number
  costPerUnit: number
  cogs: number
  fees: number
  shipping: number
  refunds: number
  estimatedProfit: number
  marginPct: number | null
  costConfigured: boolean
}

export type ProfitEstimate = {
  grossRevenue: number
  refunded: number
  netRevenue: number
  totalCogs: number
  totalFees: number
  totalShipping: number
  estimatedProfit: number
  marginPct: number | null
  products: ProductProfitEstimate[]
  lowMarginProducts: ProductProfitEstimate[]
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, value)
}

function toRatio(percent: number): number {
  return clampNonNegative(percent) / 100
}

export function calculateProfitEstimate(input: ProfitEstimatorConfig): ProfitEstimate {
  const grossRevenue = clampNonNegative(input.grossRevenue)
  const refunded = clampNonNegative(input.refunded)
  const netRevenue = Math.max(0, grossRevenue - refunded)
  const totalOrders = clampNonNegative(input.totalOrders)
  const totalUnitsSold = Math.max(1, clampNonNegative(input.totalUnitsSold))
  const feePercentRatio = toRatio(input.feePercent)
  const fixedFeePerOrder = clampNonNegative(input.fixedFeePerOrder)
  const avgShippingPerOrder = clampNonNegative(input.avgShippingPerOrder)

  const knownCostProducts = input.products
    .map((product) => {
      const rawCost = input.productCosts[product.key]
      if (!Number.isFinite(rawCost) || rawCost < 0) {
        return null
      }

      return {
        units: clampNonNegative(product.unitsSold),
        costPerUnit: rawCost,
      }
    })
    .filter((value): value is { units: number; costPerUnit: number } => Boolean(value))

  const knownUnits = knownCostProducts.reduce((sum, item) => sum + item.units, 0)
  const weightedKnownCost =
    knownUnits > 0
      ? knownCostProducts.reduce((sum, item) => sum + item.units * item.costPerUnit, 0) / knownUnits
      : 0

  const productEstimates = input.products.map((product) => {
    const unitsSold = clampNonNegative(product.unitsSold)
    const revenue = clampNonNegative(product.revenue)
    const configured = Number.isFinite(input.productCosts[product.key]) && input.productCosts[product.key] >= 0
    const costPerUnit = configured ? input.productCosts[product.key] : weightedKnownCost

    const revenueShare = grossRevenue > 0 ? revenue / grossRevenue : 0
    const unitsShare = totalUnitsSold > 0 ? unitsSold / totalUnitsSold : 0

    const cogs = unitsSold * costPerUnit
    const fees = (grossRevenue * feePercentRatio + totalOrders * fixedFeePerOrder) * revenueShare
    const shipping = totalOrders * avgShippingPerOrder * unitsShare
    const refundsForProduct = refunded * revenueShare
    const estimatedProfit = revenue - refundsForProduct - cogs - fees - shipping
    const marginPct = revenue > 0 ? estimatedProfit / revenue : null

    return {
      key: product.key,
      productName: product.productName,
      unitsSold: round2(unitsSold),
      revenue: round2(revenue),
      costPerUnit: round2(costPerUnit),
      cogs: round2(cogs),
      fees: round2(fees),
      shipping: round2(shipping),
      refunds: round2(refundsForProduct),
      estimatedProfit: round2(estimatedProfit),
      marginPct: marginPct != null ? Math.round(marginPct * 10000) / 10000 : null,
      costConfigured: configured,
    } satisfies ProductProfitEstimate
  })

  const totalCogs = productEstimates.reduce((sum, item) => sum + item.cogs, 0)
  const totalFees = grossRevenue * feePercentRatio + totalOrders * fixedFeePerOrder
  const totalShipping = totalOrders * avgShippingPerOrder
  const estimatedProfit = netRevenue - totalCogs - totalFees - totalShipping
  const marginPct = netRevenue > 0 ? estimatedProfit / netRevenue : null

  const lowMarginProducts = productEstimates
    .filter((item) => item.marginPct != null && item.marginPct < 0.25)
    .sort((a, b) => (a.marginPct ?? 0) - (b.marginPct ?? 0))

  return {
    grossRevenue: round2(grossRevenue),
    refunded: round2(refunded),
    netRevenue: round2(netRevenue),
    totalCogs: round2(totalCogs),
    totalFees: round2(totalFees),
    totalShipping: round2(totalShipping),
    estimatedProfit: round2(estimatedProfit),
    marginPct: marginPct != null ? Math.round(marginPct * 10000) / 10000 : null,
    products: productEstimates,
    lowMarginProducts,
  }
}
