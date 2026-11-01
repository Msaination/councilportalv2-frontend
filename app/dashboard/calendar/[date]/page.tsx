/**
 * Day calendar — all meetings on a single date.
 * URL: /dashboard/calendar/[date] (YYYY-MM-DD)
 */

'use client'

import { useEffect, useState } from 'react'
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
import { ArrowLeft, CalendarDays, Clock, MapPin } from 'lucide-react'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export default function CalendarDayPage() {
  const params = useParams()
  const dateParam = String(params.date)
  const validDate = DATE_PATTERN.test(dateParam)

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link
        href="/dashboard/calendar"
        className="flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to calendar
      </Link>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays size={22} />
          {formatMeetingDay(`${dateParam}T00:00:00`)}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {meetings.length} meeting{meetings.length === 1 ? '' : 's'} on this day.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No meetings scheduled for this day.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => (
            <li key={meeting.id} id={`meeting-${meeting.id}`}>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/calendar/${isoDay(new Date(meeting.starts_at))}#meeting-${meeting.id}`}
                        className="font-medium hover:underline"
                      >
                        {meeting.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          <Link
                            href={meetingHref(meeting)}
                            className="text-primary hover:underline font-medium"
                          >
                            {formatMeetingTime(meeting.starts_at)}
                            {meeting.ends_at
                              ? `–${formatMeetingTime(meeting.ends_at)}`
                              : ''}
                          </Link>
                        </span>
                        {meeting.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {meeting.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="secondary">{meeting.team_name}</Badge>
                      {meeting.is_mine && <Badge>Mine</Badge>}
                    </div>
                  </div>

                  {meeting.description && (
                    <p className="text-sm text-muted-foreground">
                      {meeting.description}
                    </p>
                  )}

                  {(meeting.file_title || meeting.category_title) && (
                    <Link
                      href={meetingHref(meeting)}
                      className="inline-block text-sm text-primary hover:underline"
                    >
                      Open {meetingLinkLabel(meeting)}
                    </Link>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
