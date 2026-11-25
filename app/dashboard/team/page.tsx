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
  isAdmin,
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
  const [admin, setAdmin] = useState(false)
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
        setAdmin(isAdmin(user))
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
  const canManage = selectedTeam?.can_manage ?? false

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
        <h1 className="text-2xl font-bold">Committee</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Committees keep each committee&apos;s resource categories and files isolated.
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
            <Users size={18} /> Your committees
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {admin
                ? 'No committees yet. Create one below.'
                : 'You are not a member of any committee yet.'}
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

          {admin && (
            <div className="flex gap-2 mt-4">
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="New committee name"
                disabled={busy}
              />
              <Button
                onClick={handleCreateTeam}
                disabled={busy || !newTeamName.trim()}
              >
                <Plus size={16} /> Create committee
              </Button>
            </div>
          )}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Surname, initials</th>
                    <th className="py-2 pr-3 font-medium">Party</th>
                    <th className="py-2 pr-3 font-medium">Capacity</th>
                    <th className="py-2 pr-3 font-medium">Ward</th>
                    <th className="py-2 pr-3 font-medium">Cell number</th>
                    <th className="py-2 pr-3 font-medium">Role</th>
                    {canManage && (
                      <th className="py-2 text-right font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {selectedTeam.members.map((member) => (
                    <tr key={member.user_id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">
                        {member.display_name}
                      </td>
                      <td className="py-2 pr-3">
                        {member.party_abbreviation ? (
                          <abbr
                            title={member.party}
                            className="cursor-help no-underline"
                          >
                            {member.party_abbreviation}
                          </abbr>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {member.capacity || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {member.ward ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {member.cell_number || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="secondary">{member.role}</Badge>
                      </td>
                      {canManage && (
                        <td className="py-2 text-right">
                          {member.user_id !== currentUserId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => handleRemoveMember(member.user_id)}
                            >
                              <X size={14} /> Remove
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
