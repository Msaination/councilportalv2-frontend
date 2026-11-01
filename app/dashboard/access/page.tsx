/**
 * Access page — superadmin manages users, capabilities, and employee numbers.
 * URL: /dashboard/access
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createUser,
  DEFAULT_NEW_USER_PASSWORD,
  fetchUserAccess,
  updateUserAccess,
  type UserAccess,
  type UserAccessChanges,
} from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PencilLine, ShieldCheck, UserPlus, Users, X } from 'lucide-react'

type CapabilityField = 'view_teams' | 'share_files' | 'edit_employee_numbers'

const CAPABILITY_LABELS: Record<CapabilityField, string> = {
  view_teams: 'Teams',
  share_files: 'Sharing',
  edit_employee_numbers: 'Employee No.',
}

const CAPABILITY_FIELDS = Object.keys(CAPABILITY_LABELS) as CapabilityField[]

export default function AccessPage() {
  const [users, setUsers] = useState<UserAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [employeeDraft, setEmployeeDraft] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newEmployeeNumber, setNewEmployeeNumber] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdNote, setCreatedNote] = useState<string | null>(null)
  const router = useRouter()
  const { user } = useAuth()

  const canManage = user?.capabilities.manage_access ?? false
  const canEditEmployee = canManage ||
    (user?.capabilities.edit_employee_numbers ?? false)

  useEffect(() => {
    let cancelled = false
    fetchUserAccess()
      .then((data) => {
        if (!cancelled) setUsers(data)
      })
      .catch((e) => {
        if (cancelled) return
        if ((e as Error).message.includes('Not authenticated')) {
          router.push('/login')
        } else {
          setError('Access denied. You cannot manage user access.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [router])

  const scrollToDraft = (target: UserAccess) => {
    setEditingId(target.id)
    setEmployeeDraft(target.employee_number ?? '')
  }

  const toggle = async (target: UserAccess, field: CapabilityField) => {
    const nextValue = !target.capabilities[field]
    let changes: UserAccessChanges
    if (field === 'view_teams') {
      changes = { view_teams: nextValue }
    } else if (field === 'share_files') {
      changes = { share_files: nextValue }
    } else {
      changes = { edit_employee_numbers: nextValue }
    }

    setBusyId(target.id)
    setError(null)
    try {
      const updated = await updateUserAccess(target.id, changes)
      setUsers((prev) =>
        prev.map((row) => (row.id === target.id ? updated : row)),
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const saveEmployeeNumber = async (target: UserAccess) => {
    setBusyId(target.id)
    setError(null)
    try {
      const updated = await updateUserAccess(target.id, {
        employee_number: employeeDraft.trim().toUpperCase(),
      })
      setUsers((prev) =>
        prev.map((row) => (row.id === target.id ? updated : row)),
      )
      setEditingId(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setCreatedNote(null)
    try {
      const created = await createUser({
        username: newUsername.trim(),
        email: newEmail.trim(),
        employee_number: newEmployeeNumber.trim().toUpperCase(),
      })
      setUsers((prev) =>
        [...prev, created].sort((a, b) => a.username.localeCompare(b.username)),
      )
      setCreatedNote(
        `User ${created.username} created. Default password: ${DEFAULT_NEW_USER_PASSWORD}`,
      )
      setNewUsername('')
      setNewEmail('')
      setNewEmployeeNumber('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const capabilityButton = (target: UserAccess, field: CapabilityField) => {
    const allowed = target.capabilities[field]
    return (
      <Button
        key={field}
        variant={allowed ? 'default' : 'outline'}
        size="sm"
        disabled={target.is_superuser || busyId === target.id}
        onClick={() => toggle(target, field)}
      >
        {CAPABILITY_LABELS[field]}: {allowed ? 'allowed' : 'denied'}
      </Button>
    )
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Access Control</h1>
        <p className="text-sm text-muted-foreground mt-1">
          The superadmin grants capabilities. Assigned users may only edit
          employee numbers.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
          {error}
        </div>
      )}
      {createdNote && (
        <div className="p-3 bg-green-600/10 text-green-700 text-sm rounded">
          {createdNote}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck size={18} /> Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {users.map((row) => (
              <li key={row.id} className="py-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Users size={16} className="shrink-0" />
                    <span className="font-medium truncate">{row.username}</span>
                    {row.is_superuser && (
                      <Badge variant="secondary">superadmin</Badge>
                    )}
                    {row.must_change_password && (
                      <Badge variant="outline">password change pending</Badge>
                    )}
                  </div>

                  {canEditEmployee && editingId !== row.id && (
                    <div className="flex items-center gap-2 text-sm shrink-0">
                      <span className="text-muted-foreground">
                        {row.employee_number || 'No employee number'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => scrollToDraft(row)}
                      >
                        <PencilLine size={14} /> Edit
                      </Button>
                    </div>
                  )}
                </div>

                {canEditEmployee && editingId === row.id && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={employeeDraft}
                      onChange={(e) => setEmployeeDraft(e.target.value)}
                      placeholder="S123456"
                      maxLength={7}
                      disabled={busyId === row.id}
                    />
                    <Button
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() => saveEmployeeNumber(row)}
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                )}

                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    {CAPABILITY_FIELDS.map((field) =>
                      capabilityButton(row, field),
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus size={18} /> Create user
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username"
                  minLength={3}
                  maxLength={150}
                  required
                  disabled={creating}
                />
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email"
                  required
                  disabled={creating}
                />
                <Input
                  value={newEmployeeNumber}
                  onChange={(e) => setNewEmployeeNumber(e.target.value)}
                  placeholder="Employee number (S123456)"
                  maxLength={7}
                  required
                  disabled={creating}
                />
              </div>
              <Button type="submit" disabled={creating}>
                <UserPlus size={16} />
                {creating ? 'Creating...' : 'Create user'}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              New users receive the default password{' '}
              <code className="font-mono">{DEFAULT_NEW_USER_PASSWORD}</code> and
              must change it on first login.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
