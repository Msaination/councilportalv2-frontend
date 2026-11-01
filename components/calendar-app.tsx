/**
 * CalendarApp — month grid + upcoming meetings list.
 * Rendered both in the dashboard and on the standalone /calendar page.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  createMeeting,
  deleteMeeting,
  fetchMeetings,
  fetchTeams,
  type Meeting,
  type MeetingScope,
  type Team,
} from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Plus, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isoDay, meetingHref } from '@/lib/meetings'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function monthCells(month: Date): (Date | null)[] {
  const first = startOfMonth(month)
  const offset = (first.getDay() + 6) % 7 // Monday-first grid
  const daysInMonth = new Date(
    month.getFullYear(), month.getMonth() + 1, 0,
  ).getDate()

  const cells: (Date | null)[] = Array(offset).fill(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function CalendarApp() {
  const [scope, setScope] = useState<MeetingScope>('all')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [refreshKey, setRefreshKey] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState(() => toDateInputValue(new Date()))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [teamId, setTeamId] = useState('')

  const { user } = useAuth()
  const isStaff = user?.is_staff ?? false
  const canUseTeams = user?.capabilities.view_teams ?? false

  useEffect(() => {
    let cancelled = false
    fetchMeetings(scope, true)
      .then((data) => {
        if (cancelled) return
        setMeetings(data)
        setNow(Date.now())
        setError(null)
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [scope, refreshKey])

  useEffect(() => {
    if (!isStaff || !canUseTeams) return
    let cancelled = false
    fetchTeams()
      .then((data) => {
        if (!cancelled) setTeams(data)
      })
      .catch(() => { /* team select stays empty */ })
    return () => { cancelled = true }
  }, [isStaff, canUseTeams])

  const changeScope = (next: MeetingScope) => {
    if (next === scope) return
    setLoading(true)
    setScope(next)
  }

  const refresh = () => setRefreshKey((key) => key + 1)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const startsAt = new Date(`${date}T${startTime}:00`)
      const endsAt = endTime ? new Date(`${date}T${endTime}:00`) : null
      if (endsAt && endsAt <= startsAt) {
        throw new Error('The end time must be after the start time.')
      }
      await createMeeting({
        title,
        description,
        location,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt ? endsAt.toISOString() : null,
        team: teamId ? Number(teamId) : null,
      })
      setTitle('')
      setDescription('')
      setLocation('')
      setShowForm(false)
      refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this meeting?')) return
    try {
      await deleteMeeting(id)
      refresh()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const upcoming = meetings
    .filter((meeting) => new Date(meeting.starts_at).getTime() >= now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 10)

  const meetingsByDay = new Map<string, Meeting[]>()
  for (const meeting of meetings) {
    const key = dayKey(new Date(meeting.starts_at))
    const existing = meetingsByDay.get(key) ?? []
    existing.push(meeting)
    meetingsByDay.set(key, existing)
  }

  const todayKey = dayKey(new Date(now))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays size={22} /> Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upcoming council meetings and sittings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={scope === 'mine' ? 'default' : 'outline'}
            size="sm"
            onClick={() => changeScope('mine')}
          >
            My meetings
          </Button>
          <Button
            variant={scope === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => changeScope('all')}
          >
            All meetings
          </Button>
          {isStaff && (
            <Button size="sm" onClick={() => setShowForm((open) => !open)}>
              <Plus size={16} /> New meeting
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
          {error}
        </div>
      )}

      {isStaff && showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule a meeting</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Meeting title"
                  required
                  disabled={saving}
                />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location (e.g. Council Chamber)"
                  disabled={saving}
                />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={saving}
                />
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    disabled={saving}
                  />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={saving}
                  />
                </div>
                {teams.length > 0 && (
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    disabled={saving}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All teams</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Agenda or notes (optional)"
                rows={3}
                disabled={saving}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Schedule meeting'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {month.toLocaleDateString(undefined, {
                month: 'long', year: 'numeric',
              })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonth(new Date(
                  month.getFullYear(), month.getMonth() - 1, 1,
                ))}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonth(startOfMonth(new Date()))}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonth(new Date(
                  month.getFullYear(), month.getMonth() + 1, 1,
                ))}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
              {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells(month).map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="min-h-24 rounded border bg-muted/20" />
                }
                const dayMeetings = meetingsByDay.get(dayKey(day)) ?? []
                const isToday = dayKey(day) === todayKey
                return (
                  <div
                    key={dayKey(day)}
                    className={cn(
                      'min-h-24 rounded border p-1 space-y-1',
                      isToday && 'border-primary bg-primary/5',
                    )}
                  >
                    <Link
                      href={`/dashboard/calendar/${isoDay(day)}`}
                      className={cn(
                        'text-xs font-medium hover:underline',
                        isToday ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {day.getDate()}
                    </Link>
                    {dayMeetings.slice(0, 3).map((meeting) => (
                      <Link
                        key={meeting.id}
                        href={`/dashboard/calendar/${isoDay(day)}#meeting-${meeting.id}`}
                        title={`${meeting.title} — ${formatTime(meeting.starts_at)}`}
                        className="block truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] leading-tight hover:bg-primary/20"
                      >
                        {formatTime(meeting.starts_at)} {meeting.title}
                      </Link>
                    ))}
                    {dayMeetings.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{dayMeetings.length - 3} more
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-4 self-start">
          <CardHeader>
            <CardTitle className="text-base">Upcoming meetings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming meetings.
              </p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((meeting) => (
                  <li key={meeting.id} className="py-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/calendar/${isoDay(new Date(meeting.starts_at))}#meeting-${meeting.id}`}
                          className="font-medium text-sm truncate hover:underline block"
                        >
                          {meeting.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {formatDay(meeting.starts_at)} ·{' '}
                          {formatTime(meeting.starts_at)}
                          {meeting.ends_at ? `–${formatTime(meeting.ends_at)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {meeting.is_mine && (
                          <Badge variant="secondary">Mine</Badge>
                        )}
                        {isStaff && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(meeting.id)}
                            aria-label={`Delete ${meeting.title}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {meeting.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {meeting.team_name}
                      </span>
                    </div>
                    {(meeting.file_title || meeting.category_title) && (
                      <Link
                        href={meetingHref(meeting)}
                        className="text-xs text-primary hover:underline"
                      >
                        {meeting.file_title || meeting.category_title}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
