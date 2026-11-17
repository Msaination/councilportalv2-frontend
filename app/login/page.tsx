/** Login page — JWT auth against the Django API. */

'use client'

import { useState } from 'react'
import { getApiBaseUrl, loginJwt, checkJwtAuth } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { LogIn, Lock, User, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const submittedUsername = String(formData.get('username') || username).trim()
    const submittedPassword = String(formData.get('password') || password)
    if (!submittedUsername || !submittedPassword) return
    setSubmitting(true)
    setError(null)
    try {
      const ok = await loginJwt(submittedUsername, submittedPassword)
      if (ok) {
        const user = await checkJwtAuth()
        router.push(
          user?.must_change_password
            ? '/dashboard/profile?force=1'
            : '/dashboard',
        )
      } else {
        setError('Login failed. Check your credentials.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
            <LogIn size={24} className="text-primary" />
          </div>
          <CardTitle className="text-2xl">Emalahleni Council Portal (ECOP)</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to access council resources
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
                {error}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1">
                <User size={16} /> Username
              </label>
              <Input
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1">
                <Lock size={16} /> Password
              </label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full cursor-pointer bg-green-600 text-white hover:bg-green-700"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => window.location.assign(
                `${getApiBaseUrl()}/api/auth/oidc/authenticate/`,
              )}
            >
              Continue with Council SSO
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
