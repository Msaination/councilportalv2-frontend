/**
 * Analytics — download/upload totals and recent activity.
 * Backed by the staff-only /api/admin/stats/ endpoints.
 *
 * URL: /dashboard/analytics
 */

'use client'

import { useEffect, useState } from 'react'
import {
  fetchStatsSummary, fetchDownloadLogs, fetchUploadLogs,
  type StatsSummary, type DownloadLog, type UploadLog,
} from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Download, Upload, AlertTriangle } from 'lucide-react'

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const [summary, setSummary] = useState<StatsSummary | null>(null)
  const [downloads, setDownloads] = useState<DownloadLog[]>([])
  const [uploads, setUploads] = useState<UploadLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user?.is_staff) return

    let cancelled = false
    Promise.all([
      fetchStatsSummary(),
      fetchDownloadLogs(),
      fetchUploadLogs(),
    ]).then(([summaryData, downloadData, uploadData]) => {
      if (cancelled) return
      setSummary(summaryData)
      setDownloads(downloadData)
      setUploads(uploadData)
    }).catch((e: unknown) => {
      if (!cancelled) setError((e as Error).message)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [authLoading, user?.is_staff])

  if (authLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  }

  if (!user?.is_staff) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 flex items-start gap-3">
            <AlertTriangle size={20} className="text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Analytics is available to admins only</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ask an administrator if you need access to download statistics.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse h-6 bg-muted rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 size={22} className="text-primary" />
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Download size={16} /> Total downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{summary.total_downloads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Upload size={16} /> Total uploads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{summary.total_uploads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most downloaded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">
                {summary.top_files[0]?.download_count ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {summary.top_files[0]?.title ?? 'No downloads yet'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {summary && summary.top_files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top files</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {summary.top_files.map((file) => (
                <li key={file.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate pr-4">{file.title}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {file.download_count}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ActivityTable
        title="Recent downloads"
        empty="No downloads recorded yet."
        rows={downloads.map((log) => ({
          id: `d-${log.id}`,
          name: log.file,
          who: log.user?.username ?? 'Anonymous',
          when: log.downloaded_at,
        }))}
      />

      <ActivityTable
        title="Recent uploads"
        empty="No uploads recorded yet."
        rows={uploads.map((log) => ({
          id: `u-${log.id}`,
          name: log.file,
          who: log.user?.username ?? 'Unknown',
          when: log.uploaded_at,
        }))}
      />
    </div>
  )
}

interface ActivityRow {
  id: string
  name: string
  who: string
  when: string
}

function ActivityTable({
  title, empty, rows,
}: {
  title: string
  empty: string
  rows: ActivityRow[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 font-medium">File</th>
                  <th className="py-2 font-medium">User</th>
                  <th className="py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 truncate max-w-xs">{row.name}</td>
                    <td className="py-2 pr-4">{row.who}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(row.when).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
