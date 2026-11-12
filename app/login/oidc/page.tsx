/**
 * OIDC handoff route — receives JWT tokens from the Django callback in the
 * URL fragment (never visible to the server), stores them the same way the
 * password login does, then routes into the dashboard.
 *
 * URL: /login/oidc#access=...&refresh=...
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { storeTokens } from '@/lib/api'
import { LogIn, ShieldCheck, ShieldAlert } from 'lucide-react'

export default function OidcHandoffPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash)
    const access = params.get('access')
    const refresh = params.get('refresh')

    if (!access || !refresh) {
      setError('SSO login incomplete — no tokens received. Please try again.')
      return
    }

    storeTokens(access, refresh)
    // Drop the tokens from the address bar before navigating.
    window.history.replaceState(null, '', window.location.pathname)
    router.replace('/dashboard')
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="max-w-md w-full p-6 space-y-3 text-center">
          <ShieldAlert size={40} className="mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Sign-in failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="text-sm text-primary underline"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="max-w-md w-full p-6 space-y-3 text-center">
        <ShieldCheck size={40} className="mx-auto text-green-600" />
        <h1 className="text-xl font-semibold flex items-center justify-center gap-2">
          <LogIn size={18} /> Signing you in…
        </h1>
        <p className="text-sm text-muted-foreground">
          Completing Council SSO login.
        </p>
      </div>
    </div>
  )
}