type DailyMetrics = {
    revenue: number
    expenses: number
    profit: number
    topProduct: string
  }
  
  export function generateSummary(metrics: DailyMetrics) {
    const { revenue, expenses, profit, topProduct } = metrics
  
    let tone = profit >= 0 ? "positive" : "warning"
  
    return tone === "positive"
      ? `Today you made a profit of ₺${profit}. Your top product was ${topProduct}. Revenue looks healthy. Consider pushing your best-selling product tomorrow.`
      : `⚠️ Today profit dropped to ₺${profit}. Expenses were higher than revenue. Review costs and focus on your strongest product: ${topProduct}.`
  }
  