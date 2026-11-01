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
  LayoutDashboard,
  FileImage,
  Download,
  Upload,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

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
                <p className="text-sm text-muted-foreground">Collections</p>
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

      {/* Upcoming meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Upcoming meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming meetings.
            </p>
          ) : (
            <ul className="space-y-3">
              {meetings.map((meeting) => (
                <li key={meeting.id}>
                  <Link
                    href={`/dashboard/calendar/${isoDay(new Date(meeting.starts_at))}#meeting-${meeting.id}`}
                    className="flex items-center justify-between gap-3 hover:underline"
                  >
                    <span className="text-sm font-medium">{meeting.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(meeting.starts_at).toLocaleDateString()} ·{' '}
                      {new Date(meeting.starts_at).toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard/calendar"
            className="inline-block mt-3 text-sm text-primary hover:underline"
          >
            Open calendar
          </Link>
        </CardContent>
      </Card>

      {/* Collections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Collections</CardTitle>
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
                  {cat.file_count} assets
                </p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
