/**
 * Profile page — users edit their own identity, contact details, avatar,
 * biography, and password. URL: /dashboard/profile
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  changePassword,
  fetchProfile,
  updateProfile,
  type Profile,
} from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyRound, Save, User } from 'lucide-react'

const MAX_BIO_LENGTH = 500

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [cellNumber, setCellNumber] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  const { reload } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const forceChange = searchParams.get('force') === '1'

  useEffect(() => {
    let cancelled = false
    fetchProfile()
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setUsername(data.username)
        setEmail(data.email)
        setCellNumber(data.cell_number)
        setBio(data.bio)
        setAvatarPreview(data.avatar)
      })
      .catch((e) => {
        if (cancelled) return
        if ((e as Error).message.includes('Not authenticated')) {
          router.push('/login')
        } else {
          setError((e as Error).message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [router])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await updateProfile({
        username,
        email,
        cell_number: cellNumber,
        bio,
        avatar: avatarFile ?? undefined,
      })
      setProfile(updated)
      setAvatarFile(null)
      setAvatarPreview(updated.avatar)
      await reload()
      setSuccess('Profile saved.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(null)
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.')
      return
    }
    setChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setPwSuccess('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (forceChange) {
        window.location.assign('/dashboard')
        return
      }
      await reload()
    } catch (e) {
      setPwError((e as Error).message)
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your identity, contact details, and password.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
          {error}
        </div>
      )}
      {forceChange && (
        <div className="p-3 bg-amber-500/10 text-amber-700 text-sm rounded">
          You must change your password before you can use the portal.
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-600/10 text-green-700 text-sm rounded">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User size={18} /> Profile details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {avatarPreview && (
                  <AvatarImage src={avatarPreview} alt={username || 'Avatar'} />
                )}
                <AvatarFallback className="text-2xl">
                  {(username?.charAt(0) || 'U').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Avatar
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={saving}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, GIF or WebP, up to 2 MB.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-username" className="text-sm font-medium block mb-1">
                  Username
                </label>
                <Input
                  id="profile-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={150}
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="profile-email" className="text-sm font-medium block mb-1">
                  Email
                </label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="profile-employee" className="text-sm font-medium block mb-1">
                  Employee number
                </label>
                <Input
                  id="profile-employee"
                  value={profile?.employee_number || 'Not assigned'}
                  readOnly
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Managed by the administrator.
                </p>
              </div>
              <div>
                <label htmlFor="profile-cell" className="text-sm font-medium block mb-1">
                  Cell number
                </label>
                <Input
                  id="profile-cell"
                  value={cellNumber}
                  onChange={(e) => setCellNumber(e.target.value)}
                  placeholder="0821234567"
                  pattern="0[0-9]{9}"
                  maxLength={10}
                  inputMode="numeric"
                  title="10 digits starting with 0"
                  disabled={saving}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="profile-bio" className="text-sm font-medium block mb-1">
                  Short biography ({bio.length}/{MAX_BIO_LENGTH})
                </label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={MAX_BIO_LENGTH}
                  rows={4}
                  disabled={saving}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound size={18} /> Change password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {pwError && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="p-3 bg-green-600/10 text-green-700 text-sm rounded">
                {pwSuccess}
              </div>
            )}

            <div>
              <label htmlFor="current-password" className="text-sm font-medium block mb-1">
                Current password
              </label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={changingPassword}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new-password" className="text-sm font-medium block mb-1">
                  New password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={changingPassword}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-sm font-medium block mb-1">
                  Confirm new password
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={changingPassword}
                />
              </div>
            </div>

            <Button type="submit" disabled={changingPassword}>
              <KeyRound size={16} />
              {changingPassword ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
