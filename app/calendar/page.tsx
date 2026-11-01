/**
 * Standalone calendar app — full-page calendar without the dashboard sidebar.
 * URL: /calendar
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkJwtAuth } from '@/lib/api'
import { AppHeader } from '@/components/app-header'
import { CalendarApp } from '@/components/calendar-app'

export default function StandaloneCalendarPage() {
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    checkJwtAuth()
      .then((user) => {
        if (cancelled) return
        if (user) {
          setReady(true)
        } else {
          router.replace('/login')
        }
      })
      .catch(() => {
        if (!cancelled) router.replace('/login')
      })
    return () => { cancelled = true }
  }, [router])

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 bg-muted/20">
      <AppHeader />
      <main className="p-6 max-w-6xl mx-auto">
        <CalendarApp />
      </main>
    </div>
  )
}
