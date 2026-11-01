import type { Meeting } from '@/lib/api'

/** Local YYYY-MM-DD key for a date. */
export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Where the meeting's time links to: document, collection, or details. */
export function meetingHref(meeting: Meeting): string {
  if (meeting.file) {
    return `/dashboard/assets/${meeting.file}`
  }
  if (meeting.category_slug) {
    return `/dashboard/collections/${meeting.category_slug}`
  }
  return `/dashboard/calendar/meetings/${meeting.id}`
}

export function meetingLinkLabel(meeting: Meeting): string {
  if (meeting.file_title) return meeting.file_title
  if (meeting.category_title) return meeting.category_title
  return 'Meeting details'
}

export function formatMeetingTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatMeetingDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}
