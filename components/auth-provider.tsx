/**
 * React context for JWT-based auth against the Django API.
 *
 * Tokens are stored in localStorage and refreshed automatically.
 *
 * Usage:
 *   const { user, loading } = useAuth()
 *   if (!user) <LoginPage />
 */

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { checkJwtAuth, loginJwt, logoutJwt, type User } from '@/lib/api'

interface AuthState {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  reload: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    const u = await checkJwtAuth()
    setUser(u)
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    const ok = await loginJwt(username, password)
    if (ok) await reload()
    return ok
  }

  const handleLogout = async () => {
    await logoutJwt()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login: handleLogin, logout: handleLogout, reload }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
