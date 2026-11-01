/**
 * Team page — create teams, switch the active workspace, manage members.
 * URL: /dashboard/team
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  checkJwtAuth,
  fetchTeam,
  fetchTeams,
  createTeam,
  switchTeam,
  addTeamMember,
  removeTeamMember,
  type Team,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Plus, UserPlus, Users, X } from 'lucide-react'

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newMember, setNewMember] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchTeams(), checkJwtAuth()])
      .then(([teamList, user]) => {
        if (cancelled) return
        setTeams(teamList)
        setCurrentUserId(user?.id ?? null)
        setActiveSlug(user?.active_team?.slug ?? null)
        setSelectedSlug(user?.active_team?.slug ?? teamList[0]?.slug ?? null)
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

  const selectedTeam = teams.find((team) => team.slug === selectedSlug) ?? null
  const canManage = selectedTeam?.role === 'owner' || selectedTeam?.role === 'admin'

  const reloadTeam = async (slug: string) => {
    const updated = await fetchTeam(slug)
    setTeams((prev) => prev.map((team) => (team.slug === slug ? updated : team)))
  }

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handleCreateTeam = () =>
    runAction(async () => {
      const name = newTeamName.trim()
      if (!name) return
      const team = await createTeam(name)
      setTeams(await fetchTeams())
      setSelectedSlug(team.slug)
      setNewTeamName('')
    })

  const handleSwitch = (slug: string) =>
    runAction(async () => {
      await switchTeam(slug)
      setActiveSlug(slug)
    })

  const handleAddMember = () =>
    runAction(async () => {
      const username = newMember.trim()
      if (!username || !selectedTeam) return
      await addTeamMember(selectedTeam.slug, username)
      await reloadTeam(selectedTeam.slug)
      setNewMember('')
    })

  const handleRemoveMember = (userId: number) =>
    runAction(async () => {
      if (!selectedTeam) return
      await removeTeamMember(selectedTeam.slug, userId)
      await reloadTeam(selectedTeam.slug)
    })

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
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Workspaces keep each team&apos;s categories and assets isolated.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users size={18} /> Your teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              You are not a member of any team yet. Create one below.
            </p>
          ) : (
            <ul className="divide-y">
              {teams.map((team) => (
                <li
                  key={team.slug}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSlug(team.slug)}
                    className="text-left"
                  >
                    <span className="font-medium hover:underline">
                      {team.name}
                    </span>
                    {activeSlug === team.slug && (
                      <Badge className="ml-2" variant="default">Active</Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {team.member_count} member{team.member_count === 1 ? '' : 's'}
                      {team.role ? ` • you are ${team.role}` : ''}
                    </p>
                  </button>
                  {activeSlug === team.slug ? (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Check size={14} /> Current
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleSwitch(team.slug)}
                    >
                      Switch
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 mt-4">
            <Input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="New team name"
              disabled={busy}
            />
            <Button onClick={handleCreateTeam} disabled={busy || !newTeamName.trim()}>
              <Plus size={16} /> Create team
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedTeam && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Members of {selectedTeam.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {selectedTeam.members.map((member) => (
                <li
                  key={member.user_id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-medium">{member.username}</span>
                    <Badge className="ml-2" variant="secondary">
                      {member.role}
                    </Badge>
                  </div>
                  {canManage && member.user_id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleRemoveMember(member.user_id)}
                    >
                      <X size={14} /> Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>

            {canManage && (
              <div className="flex gap-2 mt-4">
                <Input
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  placeholder="Username to add"
                  disabled={busy}
                />
                <Button onClick={handleAddMember} disabled={busy || !newMember.trim()}>
                  <UserPlus size={16} /> Add member
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
