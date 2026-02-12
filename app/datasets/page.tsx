'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Upload,
  Sparkles,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  Search,
  Plus,
} from 'lucide-react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { mockDatasets, type Dataset } from '@/lib/mock-data'

const statusConfig = {
  uploaded: {
    icon: Upload,
    label: 'Uploaded',
    variant: 'outline' as const,
  },
  cleaning: {
    icon: Sparkles,
    label: 'Cleaning',
    variant: 'secondary' as const,
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    variant: 'secondary' as const,
  },
  ready: {
    icon: CheckCircle2,
    label: 'Ready',
    variant: 'default' as const,
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    variant: 'destructive' as const,
  },
}

export default function DatasetsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [datasets] = useState<Dataset[]>(mockDatasets)

  const filteredDatasets = datasets.filter((dataset) =>
    dataset.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader
          title="Datasets"
          description="Manage your uploaded datasets"
        />
        <main className="flex-1 p-4 md:p-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>All Datasets</CardTitle>
                  <CardDescription>
                    {datasets.length} total datasets • {datasets.filter((d) => d.status === 'ready').length} ready
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search datasets..."
                      className="w-64 pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button asChild>
                    <Link href="/upload">
                      <Plus className="mr-2 h-4 w-4" />
                      Upload
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Records</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDatasets.map((dataset) => {
                      const status = statusConfig[dataset.status]
                      const StatusIcon = status.icon
                      const isAnimating = dataset.status === 'cleaning' || dataset.status === 'processing'

                      return (
                        <TableRow key={dataset.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="font-medium text-foreground">
                                {dataset.name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {dataset.fileType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="gap-1">
                              <StatusIcon className={`h-3 w-3 ${isAnimating ? 'animate-spin' : ''}`} />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {dataset.status === 'ready' ? dataset.recordsCount.toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {dataset.size}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {dataset.lastUpdated}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
