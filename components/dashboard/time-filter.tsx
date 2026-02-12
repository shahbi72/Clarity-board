'use client'

import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TimeFilterProps {
  value: string
  onChange: (value: string) => void
}

const timeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
]

export function TimeFilter({ value, onChange }: TimeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden md:flex md:items-center md:gap-1">
        {timeOptions.slice(0, 4).map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(option.value)}
            className="text-xs"
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="md:hidden">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Custom</span>
      </Button>
    </div>
  )
}
