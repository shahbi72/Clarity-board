// lib/insights/calcDailyMetrics.ts

type Transaction = {
    amount: number
    type: "revenue" | "expense"
    productName?: string
  }
  
  export function calcDailyMetrics(transactions: Transaction[]) {
    let revenue = 0
    let expenses = 0
    const productSales: Record<string, number> = {}
  
    for (const t of transactions) {
      if (t.type === "revenue") {
        revenue += t.amount
  
        if (t.productName) {
          productSales[t.productName] =
            (productSales[t.productName] || 0) + t.amount
        }
      }
  
      if (t.type === "expense") {
        expenses += t.amount
      }
    }
  
    const profit = revenue - expenses
  
    const topProduct =
      Object.entries(productSales).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"
  
    return {
      revenue,
      expenses,
      profit,
      topProduct,
    }
  }
  