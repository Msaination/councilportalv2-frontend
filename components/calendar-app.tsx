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
  ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Plus,
  Trash2, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isoDay, meetingHref } from '@/lib/meetings'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

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

function timeRange(meeting: Meeting): string {
  const start = formatTime(meeting.starts_at)
  return meeting.ends_at ? `${start} – ${formatTime(meeting.ends_at)}` : start
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

/** "Today" / "Tomorrow" / weekday+date, for at-a-glance scanning. */
function relativeDay(iso: string): string {
  const start = new Date(iso)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((start.getTime() - today.getTime()) / 86_400_000)

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return start.toLocaleDateString(undefined, {
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
  // Mobile agenda: which day's meetings are expanded below the compact grid.
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())

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

  // Mobile agenda shows the tapped day; falls back to the whole month so the
  // panel is never empty for no reason.
  const selectedDayMeetings = meetings
    .filter((m) => isSameDay(new Date(m.starts_at), selectedDay))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  const monthMeetings = meetings.filter((m) => {
    const d = new Date(m.starts_at)
    return d.getMonth() === month.getMonth()
      && d.getFullYear() === month.getFullYear()
  })

  const goToMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(next)
    // Keep the mobile agenda in sync with the month being viewed.
    setSelectedDay(next)
  }

  const goToToday = () => {
    const today = new Date()
    setMonth(startOfMonth(today))
    setSelectedDay(today)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Calendar</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {monthMeetings.length} meeting{monthMeetings.length === 1 ? '' : 's'} this month
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope toggle — segmented control reads as one choice, not two buttons */}
          <div className="flex rounded-lg border border-border p-0.5">
            {(['mine', 'all'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeScope(option)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
                  scope === option
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option === 'mine' ? 'My meetings' : 'All meetings'}
              </button>
            ))}
          </div>

          {isStaff && (
            <Button size="sm" onClick={() => setShowForm((open) => !open)}>
              <Plus size={16} />
              <span className="hidden sm:inline">New meeting</span>
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
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold">
                {month.toLocaleDateString(undefined, {
                  month: 'long', year: 'numeric',
                })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8"
                  aria-label="Previous month" onClick={() => goToMonth(-1)}>
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="outline" size="sm" className="h-8"
                  onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8"
                  aria-label="Next month" onClick={() => goToMonth(1)}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday header — single letters on phones, full names from md up */}
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
                {WEEKDAYS.map((day, i) => (
                  <div key={day}>
                    <span className="hidden md:inline">{day}</span>
                    <span className="md:hidden">{WEEKDAYS_SHORT[i]}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthCells(month).map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="min-h-11 rounded-lg md:min-h-24" />
                  }
                  const dayMeetings = meetingsByDay.get(dayKey(day)) ?? []
                  const hasMeetings = dayMeetings.length > 0
                  const hasMine = dayMeetings.some((m) => m.is_mine)
                  const isToday = dayKey(day) === todayKey
                  const isSelected = isSameDay(day, selectedDay)
                  const isPast = new Date(day).setHours(23, 59, 59, 999) < now

                  return (
                    <div
                      key={dayKey(day)}
                      className={cn(
                        'relative rounded-lg border p-1 transition-colors',
                        'min-h-11 md:min-h-24',
                        // Days without meetings stay visually quiet...
                        !hasMeetings && !isToday && 'border-border/60',
                        !hasMeetings && isSelected && !isToday && 'border-primary/50',
                        // ...so days WITH meetings can stand out clearly.
                        hasMeetings && !isToday && 'border-primary/40 bg-primary/[0.06]',
                        hasMeetings && hasMine && 'border-primary/60 bg-primary/10',
                        isToday && 'border-primary ring-1 ring-primary/30 bg-primary/10',
                        isPast && 'opacity-60',
                      )}
                    >
                      {/* Mobile: tap the cell to load its agenda below */}
                      <button
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          'mx-auto flex h-5 w-5 items-center justify-center rounded-full text-xs md:hidden',
                          isToday && 'bg-primary font-bold text-primary-foreground',
                          !isToday && hasMeetings && 'font-bold text-primary',
                          !isToday && !hasMeetings && isSelected && 'bg-primary/15 text-primary',
                          !isToday && !hasMeetings && !isSelected && 'text-muted-foreground',
                        )}
                        aria-label={`Show meetings on ${day.toDateString()}`}
                      >
                        {day.getDate()}
                      </button>

                      {/* Mobile: count badge + dots so busy days are obvious */}
                      {hasMeetings && (
                        <div className="mt-0.5 flex justify-center md:hidden">
                          <span
                            className={cn(
                              'rounded-full px-1 text-[9px] font-semibold leading-4',
                              hasMine
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-primary/20 text-primary',
                            )}
                          >
                            {dayMeetings.length}
                          </span>
                        </div>
                      )}

                      {/* Desktop: day link + meeting chips */}
                      <Link
                        href={`/dashboard/calendar/${isoDay(day)}`}
                        className={cn(
                          'hidden text-xs hover:underline md:inline-block',
                          isToday && 'font-bold text-primary',
                          !isToday && hasMeetings && 'font-bold text-primary',
                          !isToday && !hasMeetings && 'font-medium text-muted-foreground',
                        )}
                      >
                        {day.getDate()}
                      </Link>
                      <div className="mt-1 hidden space-y-0.5 md:block">
                        {dayMeetings.slice(0, 3).map((meeting) => (
                          <Link
                            key={meeting.id}
                            href={`/dashboard/calendar/${isoDay(day)}#meeting-${meeting.id}`}
                            title={`${meeting.title} — ${formatTime(meeting.starts_at)}`}
                            className={cn(
                              'block truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight transition-colors',
                              meeting.is_mine
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-primary/15 text-foreground hover:bg-primary/25',
                            )}
                          >
                            {formatTime(meeting.starts_at)} {meeting.title}
                          </Link>
                        ))}
                        {dayMeetings.length > 3 && (
                          <div className="pl-1 text-[10px] font-medium text-primary">
                            +{dayMeetings.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend — explains the highlight without relying on guesswork */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-primary/40 bg-primary/[0.06]" />
                  Has meetings
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-primary/60 bg-primary/10" />
                  Includes yours
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  Today
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Mobile agenda — the month grid is too small for detail on phones,
              so the selected day's meetings are listed in full underneath. */}
          <Card className="md:hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{relativeDay(selectedDay.toISOString())}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {selectedDayMeetings.length} meeting{selectedDayMeetings.length === 1 ? '' : 's'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDayMeetings.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                  <CalendarDays size={28} className="text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Nothing scheduled for this day.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {selectedDayMeetings.map((meeting) => (
                    <li key={meeting.id} className="py-2.5 first:pt-0 last:pb-0">
                      <Link
                        href={`/dashboard/calendar/${isoDay(new Date(meeting.starts_at))}#meeting-${meeting.id}`}
                        className="block"
                      >
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {meeting.title}
                          </p>
                          {meeting.is_mine && (
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                              Mine
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {timeRange(meeting)}
                          </span>
                          {meeting.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin size={12} /> {meeting.location}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-4 self-start">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Upcoming</span>
              {upcoming.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {upcoming.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                <CalendarDays size={28} className="text-muted-foreground/50" />
                <p className="text-sm font-medium">No upcoming meetings</p>
                <p className="text-xs text-muted-foreground">
                  Your calendar is clear.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {upcoming.map((meeting) => (
                  <li key={meeting.id} className="group py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      {/* Date chip matches the dashboard treatment */}
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/50 leading-none">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {new Date(meeting.starts_at)
                            .toLocaleDateString(undefined, { month: 'short' })}
                        </span>
                        <span className="text-sm font-bold">
                          {new Date(meeting.starts_at).getDate()}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <Link
                            href={`/dashboard/calendar/${isoDay(new Date(meeting.starts_at))}#meeting-${meeting.id}`}
                            className="min-w-0 flex-1 truncate text-sm font-medium group-hover:underline"
                          >
                            {meeting.title}
                          </Link>
                          <div className="flex shrink-0 items-center gap-1">
                            {meeting.is_mine && (
                              <Badge variant="secondary" className="text-[10px]">
                                Mine
                              </Badge>
                            )}
                            {isStaff && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground opacity-60 hover:text-destructive hover:opacity-100"
                                onClick={() => handleDelete(meeting.id)}
                                aria-label={`Delete ${meeting.title}`}
                              >
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {timeRange(meeting)}
                          </span>
                          {meeting.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin size={11} /> {meeting.location}
                            </span>
                          )}
                          {meeting.team_name && (
                            <span className="flex items-center gap-1 truncate">
                              <Users size={11} /> {meeting.team_name}
                            </span>
                          )}
                        </div>

                        {canUseTeams && (meeting.file_title || meeting.category_title) && (
                          <Link
                            href={meetingHref(meeting)}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                          >
                            {meeting.file_title || meeting.category_title}
                            <ArrowRight size={10} />
                          </Link>
                        )}
                      </div>
                    </div>
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
