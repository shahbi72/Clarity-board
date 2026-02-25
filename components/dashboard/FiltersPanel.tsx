'use client'

import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import type { DatasetListItem } from '@/lib/types/data-pipeline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type DashboardDateRange = '7' | '30' | '90' | 'custom'

export interface DashboardFilterState {
  dateRange: DashboardDateRange
  category: string
  minAmount: string
  maxAmount: string
  search: string
  datasetId: string
  customFrom: string
  customTo: string
}

type FiltersPanelProps = {
  filters: DashboardFilterState
  datasets: DatasetListItem[]
  categories: string[]
  onFiltersChange: (next: Partial<DashboardFilterState>) => void
  onReset: () => void
}

export function FiltersPanel({
  filters,
  datasets,
  categories,
  onFiltersChange,
  onReset,
}: FiltersPanelProps) {
  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Filters
          </span>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Date range</Label>
          <Select
            value={filters.dateRange}
            onValueChange={(value) =>
              onFiltersChange({ dateRange: value as DashboardDateRange })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filters.dateRange === 'custom' ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-from">From</Label>
              <Input
                id="custom-from"
                type="date"
                value={filters.customFrom}
                onChange={(event) => onFiltersChange({ customFrom: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-to">To</Label>
              <Input
                id="custom-to"
                type="date"
                value={filters.customTo}
                onChange={(event) => onFiltersChange({ customTo: event.target.value })}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label>Dataset</Label>
          <Select
            value={filters.datasetId || 'none'}
            onValueChange={(value) =>
              onFiltersChange({ datasetId: value === 'none' ? '' : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select dataset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Current active dataset</SelectItem>
              {datasets.map((dataset) => (
                <SelectItem key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={filters.category}
            onValueChange={(value) => onFiltersChange({ category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="amount-min">Amount min</Label>
            <Input
              id="amount-min"
              type="number"
              inputMode="decimal"
              value={filters.minAmount}
              onChange={(event) => onFiltersChange({ minAmount: event.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount-max">Amount max</Label>
            <Input
              id="amount-max"
              type="number"
              inputMode="decimal"
              value={filters.maxAmount}
              onChange={(event) => onFiltersChange({ maxAmount: event.target.value })}
              placeholder="10000"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description-search">Description search</Label>
          <Input
            id="description-search"
            value={filters.search}
            onChange={(event) => onFiltersChange({ search: event.target.value })}
            placeholder="Search transactions..."
          />
        </div>
      </CardContent>
    </Card>
  )
}
