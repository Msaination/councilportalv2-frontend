/**
 * Meeting detail — full information and links to related content.
 * URL: /dashboard/calendar/meetings/[id]
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchMeeting, type Meeting } from '@/lib/api'
import {
  formatMeetingDay,
  formatMeetingTime,
  isoDay,
  meetingHref,
  meetingLinkLabel,
} from '@/lib/meetings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, MapPin, Users } from 'lucide-react'

export default function MeetingDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(id)) return
    let cancelled = false
    fetchMeeting(id)
      .then((data) => {
        if (!cancelled) setMeeting(data)
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  }

  if (error || !meeting) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-2">
        <p className="text-destructive">
          {error || 'Meeting not found.'}
        </p>
        <Link href="/dashboard/calendar" className="text-primary underline">
          Back to calendar
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link
        href={`/dashboard/calendar/${isoDay(new Date(meeting.starts_at))}`}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to day view
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatMeetingDay(meeting.starts_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary">{meeting.team_name}</Badge>
          {meeting.is_mine && <Badge>Mine</Badge>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meeting details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Clock size={16} />
            {formatMeetingTime(meeting.starts_at)}
            {meeting.ends_at
              ? `–${formatMeetingTime(meeting.ends_at)}`
              : ''}
          </p>
          {meeting.location && (
            <p className="flex items-center gap-2">
              <MapPin size={16} /> {meeting.location}
            </p>
          )}
          {meeting.attendee_names.length > 0 && (
            <p className="flex items-center gap-2">
              <Users size={16} /> {meeting.attendee_names.join(', ')}
            </p>
          )}
          {meeting.description && (
            <p className="text-muted-foreground pt-2">{meeting.description}</p>
          )}
        </CardContent>
      </Card>

      {(meeting.file_title || meeting.category_title) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related content</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={meetingHref(meeting)}
              className="text-primary hover:underline"
            >
              {meetingLinkLabel(meeting)}
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
