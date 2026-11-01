'use client'

/**
 * Dashboard layout — wraps all routes under /app/dashboard/
 * with a collapsible sidebar + top header.
 */

import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { AuthProvider } from '@/components/auth-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { checkJwtAuth } from '@/lib/api'
import '@/app/globals.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const check = async () => {
      const user = await checkJwtAuth()
      if (!user) {
        router.replace('/login')
      } else if (user.must_change_password && pathname !== '/dashboard/profile') {
        router.replace('/dashboard/profile?force=1')
      } else {
        setReady(true)
      }
    }
    check()
  }, [router, pathname])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <AuthProvider>
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden">
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </AuthProvider>
  )
}
