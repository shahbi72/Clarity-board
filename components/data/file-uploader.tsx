'use client'

import React from "react"

import { useState, useCallback } from 'react'
import {
  Upload,
  File,
  FileSpreadsheet,
  FileText,
  FileImage,
  FileJson,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
}

const fileTypeIcons: Record<string, React.ElementType> = {
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  xls: FileSpreadsheet,
  pdf: FileText,
  json: FileJson,
  txt: FileText,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return fileTypeIcons[ext] || File
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const simulateUpload = (file: File) => {
    const id = Math.random().toString(36).substring(7)
    const newFile: UploadedFile = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'uploading',
    }

    setFiles((prev) => [...prev, newFile])

    // Simulate upload progress
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 20
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, progress: 100, status: 'processing' } : f
          )
        )
        // Simulate processing
        setTimeout(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, status: 'complete' } : f
            )
          )
        }, 2000)
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, progress } : f
          )
        )
      }
    }, 200)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    for (const file of droppedFiles) {
      simulateUpload(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    for (const file of selectedFiles) {
      simulateUpload(file)
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Drop your files here
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse from your computer
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Supports CSV, Excel, PDF, JSON, TXT, and images
          </p>
          <input
            type="file"
            multiple
            className="hidden"
            id="file-input"
            onChange={handleFileSelect}
            accept=".csv,.xlsx,.xls,.pdf,.json,.txt,.png,.jpg,.jpeg"
          />
          <Button asChild className="mt-4">
            <label htmlFor="file-input" className="cursor-pointer">
              Select Files
            </label>
          </Button>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
            <CardDescription>
              {files.filter((f) => f.status === 'complete').length} of {files.length} files processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.name)
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card/50 p-3"
                >
                  <div className="rounded-lg bg-muted p-2">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-foreground">
                        {file.name}
                      </p>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    {file.status === 'uploading' && (
                      <div className="mt-2">
                        <Progress value={file.progress} className="h-1" />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Uploading... {Math.round(file.progress)}%
                        </p>
                      </div>
                    )}
                    {file.status === 'processing' && (
                      <div className="mt-2 flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        <p className="text-xs text-primary">Processing & cleaning data...</p>
                      </div>
                    )}
                    {file.status === 'complete' && (
                      <div className="mt-2 flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        <p className="text-xs text-primary">Ready for analysis</p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
