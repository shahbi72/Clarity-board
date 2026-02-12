'use client'

import React from "react"

import { useState } from 'react'
import {
  ArrowUpDown,
  AlertTriangle,
  Package,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Product } from '@/lib/mock-data'

interface RecordsTableProps {
  data: Product[]
  searchQuery: string
}

const statusConfig = {
  healthy: {
    icon: CheckCircle2,
    label: 'Healthy',
    variant: 'default' as const,
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  'low-stock': {
    icon: AlertTriangle,
    label: 'Low Stock',
    variant: 'secondary' as const,
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  },
  'out-of-stock': {
    icon: Package,
    label: 'Out of Stock',
    variant: 'destructive' as const,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  'at-risk': {
    icon: AlertCircle,
    label: 'At Risk',
    variant: 'outline' as const,
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  },
}

type SortField = 'name' | 'revenue' | 'expense' | 'profit' | 'date'
type SortDirection = 'asc' | 'desc'
type SortHeaderProps = {
  field: SortField
  onSort: (field: SortField) => void
  children: React.ReactNode
}

function SortHeader({ field, onSort, children }: SortHeaderProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 gap-1 font-medium"
      onClick={() => onSort(field)}
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </Button>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function RecordsTable({ data, searchQuery }: RecordsTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const filteredData = data.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedData = [...filteredData].sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'revenue':
        comparison = a.revenue - b.revenue
        break
      case 'expense':
        comparison = a.expense - b.expense
        break
      case 'profit':
        comparison = a.profit - b.profit
        break
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        break
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortHeader field="name" onSort={handleSort}>
                Product
              </SortHeader>
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">
              <SortHeader field="revenue" onSort={handleSort}>
                Revenue
              </SortHeader>
            </TableHead>
            <TableHead className="text-right">
              <SortHeader field="expense" onSort={handleSort}>
                Expense
              </SortHeader>
            </TableHead>
            <TableHead className="text-right">
              <SortHeader field="profit" onSort={handleSort}>
                Profit
              </SortHeader>
            </TableHead>
            <TableHead className="text-right">Inventory</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <SortHeader field="date" onSort={handleSort}>
                Date
              </SortHeader>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((product) => {
            const status = statusConfig[product.status]
            const StatusIcon = status.icon
            const isNegativeProfit = product.profit < 0

            return (
              <TableRow
                key={product.id}
                className={
                  product.status === 'out-of-stock' || product.status === 'at-risk'
                    ? 'bg-destructive/5'
                    : product.status === 'low-stock'
                      ? 'bg-yellow-500/5'
                      : ''
                }
              >
                <TableCell className="font-medium text-foreground">
                  {product.name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {product.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-primary">
                  {formatCurrency(product.revenue)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                  {formatCurrency(product.expense)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-sm ${
                    isNegativeProfit ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {formatCurrency(product.profit)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  <span
                    className={
                      product.inventory === 0
                        ? 'text-destructive'
                        : product.inventory < 20
                          ? 'text-yellow-600'
                          : 'text-muted-foreground'
                    }
                  >
                    {product.inventory}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`gap-1 ${status.className}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(product.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
