/**
 * Logout route — clears stored JWT tokens, then hard-reloads into /login.
 * URL: /logout
 */

'use client'

import { useEffect } from 'react'
import { logoutJwt } from '@/lib/api'

export default function LogoutPage() {
  useEffect(() => {
    logoutJwt().finally(() => {
      window.location.replace('/login')
    })
  }, [])

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">Signing out…</p>
    </div>
  )
}
