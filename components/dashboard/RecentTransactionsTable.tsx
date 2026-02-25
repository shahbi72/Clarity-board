'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DashboardRecentTransaction } from '@/lib/types/data-pipeline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type RecentTransactionsTableProps = {
  transactions: DashboardRecentTransaction[]
  pageSize?: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function RecentTransactionsTable({
  transactions,
  pageSize = 10,
}: RecentTransactionsTableProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return transactions.slice(start, start + pageSize)
  }, [currentPage, pageSize, transactions])

  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 p-6 text-sm text-muted-foreground">
            No transactions found for the selected filters.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((transaction) => (
                  <TableRow key={`${transaction.rowIndex}-${transaction.date ?? 'na'}`}>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell className="max-w-[280px] truncate">
                      {transaction.description ?? '-'}
                    </TableCell>
                    <TableCell>{transaction.category ?? '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          transaction.type === 'expense'
                            ? 'border-rose-200 text-rose-700 dark:border-rose-900/60 dark:text-rose-300'
                            : transaction.type === 'revenue'
                              ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900/60 dark:text-emerald-300'
                              : ''
                        }
                      >
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
