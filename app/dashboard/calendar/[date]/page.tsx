/**
 * Day calendar — all meetings on a single date.
 * URL: /dashboard/calendar/[date] (YYYY-MM-DD)
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchMeetings, type Meeting } from '@/lib/api'
import {
  formatMeetingDay,
  formatMeetingTime,
  isoDay,
  meetingHref,
  meetingLinkLabel,
} from '@/lib/meetings'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
} from 'lucide-react'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Parse YYYY-MM-DD as a *local* date (avoids the UTC shift of Date(string)). */
function parseIsoDay(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function shiftDay(value: string, delta: number): string {
  const date = parseIsoDay(value)
  date.setDate(date.getDate() + delta)
  return isoDay(date)
}

/** "Today" / "Tomorrow" / "Yesterday" / null when further away. */
function relativeDayLabel(iso: string): string | null {
  const target = parseIsoDay(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000)

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return null
}

function timeRange(meeting: Meeting): string {
  const start = formatMeetingTime(meeting.starts_at)
  return meeting.ends_at
    ? `${start} – ${formatMeetingTime(meeting.ends_at)}`
    : start
}

export default function CalendarDayPage() {
  const params = useParams()
  const dateParam = String(params.date)
  const validDate = DATE_PATTERN.test(dateParam)

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollTargetRef = useRef(false)

  useEffect(() => {
    if (!validDate) return
    let cancelled = false
    fetchMeetings('all', true, dateParam)
      .then((data) => {
        if (!cancelled) setMeetings(data)
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [dateParam, validDate])

  // The URL may carry `#meeting-123`. Because meetings arrive after mount, the
  // browser's native anchor scroll happens before the element exists — replay
  // it once the list has rendered.
  useEffect(() => {
    if (loading || scrollTargetRef.current) return
    const hash = window.location.hash
    if (!hash.startsWith('#meeting-')) return
    scrollTargetRef.current = true
    const target = document.getElementById(hash.slice(1))
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [loading, meetings])

  if (!validDate) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-destructive">Invalid date. Use YYYY-MM-DD.</p>
        <Link href="/dashboard/calendar" className="text-primary underline">
          Back to calendar
        </Link>
      </div>
    )
  }

  const dayDate = parseIsoDay(dateParam)
  const relative = relativeDayLabel(dateParam)
  const isToday = relative === 'Today'

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/calendar"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to calendar
        </Link>

        {/* Day navigation — keeps the date context while browsing */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" asChild>
            <Link href={`/dashboard/calendar/${shiftDay(dateParam, -1)}`} aria-label="Previous day">
              <ChevronLeft size={16} />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href={`/dashboard/calendar/${isoDay(new Date())}`}>Today</Link>
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" asChild>
            <Link href={`/dashboard/calendar/${shiftDay(dateParam, 1)}`} aria-label="Next day">
              <ChevronRight size={16} />
            </Link>
          </Button>
        </div>
      </div>

      {/* Header — matches the month calendar's icon-tile treatment */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border leading-none',
            isToday
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border bg-muted/50 text-muted-foreground',
          )}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide">
            {dayDate.toLocaleDateString(undefined, { month: 'short' })}
          </span>
          <span className="text-base font-bold">{dayDate.getDate()}</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">
            {formatMeetingDay(`${dateParam}T00:00:00`)}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {relative && (
              <span className="font-medium text-primary">{relative} · </span>
            )}
            {meetings.length} meeting{meetings.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CalendarDays size={32} className="text-muted-foreground/50" />
            <p className="text-sm font-medium">No meetings scheduled</p>
            <p className="text-xs text-muted-foreground">
              Nothing on the agenda for this day.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => (
            <li key={meeting.id} id={`meeting-${meeting.id}`} className="scroll-mt-6">
              <Card className="overflow-hidden transition-colors hover:border-primary/30">
                <CardContent className="flex gap-4 p-4">
                  {/* Time rail — the date is fixed for this page, so the time
                      is the useful left-hand anchor. */}
                  <div className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border pr-4 text-center">
                    <span className="text-sm font-semibold leading-tight text-primary">
                      {formatMeetingTime(meeting.starts_at)}
                    </span>
                    {meeting.ends_at && (
                      <span className="text-[11px] leading-tight text-muted-foreground">
                        {formatMeetingTime(meeting.ends_at)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="truncate text-sm font-semibold sm:text-base">
                        {meeting.title}
                      </h2>
                      {meeting.is_mine && (
                        <Badge variant="outline" className="text-[10px]">
                          Mine
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {timeRange(meeting)}
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={12} /> {meeting.location}
                        </span>
                      )}
                      {meeting.team_name && (
                        <span className="flex items-center gap-1 truncate">
                          <Users size={12} /> {meeting.team_name}
                        </span>
                      )}
                    </div>

                    {meeting.description && (
                      <p className="text-sm text-muted-foreground">
                        {meeting.description}
                      </p>
                    )}

                    {meeting.attendee_names?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {meeting.attendee_names.slice(0, 4).map((name) => (
                          <Badge
                            key={name}
                            variant="secondary"
                            className="text-[10px] font-normal"
                          >
                            {name}
                          </Badge>
                        ))}
                        {meeting.attendee_names.length > 4 && (
                          <span className="text-[11px] text-muted-foreground">
                            +{meeting.attendee_names.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {(meeting.file_title || meeting.category_title) && (
                      <Link
                        href={meetingHref(meeting)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Open {meetingLinkLabel(meeting)}
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
