'use client'

import React from 'react'

interface DashboardShellProps {
  children: React.ReactNode
}

// Legacy compatibility wrapper.
// Keep this component export stable, but do not mount any sidebar here.
// Sidebar rendering is centralized in components/dashboard/DashboardLayout.tsx.
export function DashboardShell({ children }: DashboardShellProps) {
  return <>{children}</>
}
