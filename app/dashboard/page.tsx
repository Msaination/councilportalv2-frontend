/**
 * Dashboard home — overview stats + recent activity.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchStatsSummary, type StatsSummary } from '@/lib/api'
import { fetchRootCategories, checkJwtAuth, fetchMeetings, type Category, type Meeting } from '@/lib/api'
import { isoDay } from '@/lib/meetings'
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Download,
  FileImage,
  MapPin,
  TrendingUp,
  Upload,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/** "Today" / "Tomorrow" / "in 5 days" — helps users scan the list fast. */
function relativeDay(iso: string): string {
  const start = new Date(iso)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((start.getTime() - today.getTime()) / 86_400_000)

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `In ${days} days`
  return start.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()
}

function dayLabel(iso: string): string {
  return String(new Date(iso).getDate()).padStart(2, '0')
}

function timeRange(meeting: Meeting): string {
  const start = new Date(meeting.starts_at).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  })
  if (!meeting.ends_at) return start
  const end = new Date(meeting.ends_at).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  })
  return `${start} – ${end}`
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [canViewStats, setCanViewStats] = useState(false)
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const me = await checkJwtAuth()
        if (!me) {
          router.push('/login')
          return
        }
        setCanViewStats(me.is_staff)
        const [statsData, catData, meetingData] = await Promise.all([
          me.is_staff ? fetchStatsSummary() : Promise.resolve(null),
          fetchRootCategories(),
          fetchMeetings('all'),
        ])
        setStats(statsData)
        setCategories(catData)
        setMeetings(meetingData.slice(0, 3))
      } catch (e) {
        if ((e as Error).message.includes('Not authenticated')) {
          router.push('/login')
        } else {
          console.error('Failed to load dashboard data:', e)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  useEffect(() => {
    if (window.location.hash === '#resources') {
      const element = document.getElementById('resources')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse h-8 bg-muted rounded mb-2" />
                <div className="animate-pulse h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {canViewStats && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Downloads</p>
                <p className="text-3xl font-bold">{stats?.total_downloads ?? 0}</p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Download size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {canViewStats && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Uploads</p>
                <p className="text-3xl font-bold">{stats?.total_uploads ?? 0}</p>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Upload size={24} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resources</p>
                <p className="text-3xl font-bold">{categories.length}</p>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <FileImage size={24} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {canViewStats && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top File</p>
                <p className="text-sm font-medium truncate max-w-[120px]">
                  {stats?.top_files?.[0]?.title || '—'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats?.top_files?.[0]?.download_count || 0} downloads
                </p>
              </div>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <TrendingUp size={24} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Upcoming meetings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            Upcoming meetings
          </CardTitle>
          <Link
            href="/dashboard/calendar"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight size={14} />
          </Link>
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarDays size={32} className="text-muted-foreground/60" />
              <p className="text-sm font-medium">No upcoming meetings</p>
              <p className="text-xs text-muted-foreground">
                Your calendar is clear for now.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {meetings.map((meeting, index) => {
                const isNext = index === 0
                return (
                  <li key={meeting.id}>
                    <Link
                      href={`/dashboard/calendar/${isoDay(new Date(meeting.starts_at))}#meeting-${meeting.id}`}
                      className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0 rounded-md transition-colors hover:bg-accent/60"
                    >
                      {/* Date chip */}
                      <div
                        className={cn(
                          'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border text-center leading-none',
                          isNext
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-border bg-muted/50 text-muted-foreground',
                        )}
                      >
                        <span className="text-[10px] font-semibold tracking-wide">
                          {monthLabel(meeting.starts_at)}
                        </span>
                        <span className="text-base font-bold">
                          {dayLabel(meeting.starts_at)}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium group-hover:underline">
                            {meeting.title}
                          </p>
                          {isNext && (
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                              Next
                            </Badge>
                          )}
                          {meeting.is_mine && (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
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
                          <span className="text-primary/80">{relativeDay(meeting.starts_at)}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      
      {/* Resources */}
      <Card id="resources">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/dashboard/collections/${cat.slug}`}
                className="block p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <h3 className="font-medium">{cat.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {cat.total_file_count} files
                </p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top files */}
      {canViewStats && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Most Downloaded Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.top_files && stats.top_files.length > 0 ? (
            <div className="space-y-3">
              {stats.top_files.map((f, i) => (
                <div key={f.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-6 h-6 rounded-full justify-center">
                      {i + 1}
                    </Badge>
                    <span className="text-sm font-medium">{f.title}</span>
                  </div>
                  <Badge variant="secondary">
                    {f.download_count} downloads
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No downloads yet.</p>
          )}
        </CardContent>
      </Card>
      )}



    </div>
  )
}
