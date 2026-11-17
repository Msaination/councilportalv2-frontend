/**
 * My Complaints — ward councillor's complaints, pulled from the CMS via the
 * Django gateway (PORTAL_PLAN.md §6.7). Filtering happens server-side on
 * the ward from the portal profile; the browser never touches Supabase.
 *
 * URL: /dashboard/complaints
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  fetchMyComplaints,
  type Complaint,
  type MyComplaints,
} from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Inbox,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Inbox as EmptyIcon,
} from 'lucide-react'

/** CMS status lifecycle (§6.7) → badge variant. Live values: Received, New,
 *  Assigned, In Progress, Escalated, Completed, Resolved. */
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Received: 'outline',
  New: 'outline',
  Assigned: 'secondary',
  'In Progress': 'secondary',
  Escalated: 'destructive',
  Resolved: 'default',
  Completed: 'default',
}

function statusVariant(status: string) {
  return STATUS_VARIANT[status] ?? 'secondary'
}

export default function ComplaintsPage() {
  const router = useRouter()
  const [data, setData] = useState<MyComplaints | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setRefreshing(true)
    setError(null)
    try {
      setData(await fetchMyComplaints())
    } catch (e) {
      const message = (e as Error).message
      setError(
        message.includes('Not authenticated')
          ? 'auth'
          : message.replace('API: ', ''),
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetchMyComplaints().then((result) => {
      if (!cancelled) setData(result)
    }).catch((e: unknown) => {
      if (cancelled) return
      const message = (e as Error).message
      setError(
        message.includes('Not authenticated')
          ? 'auth'
          : message.replace('API: ', ''),
      )
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (error === 'auth') {
    router.push('/login')
    return null
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse h-6 bg-muted rounded w-48" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const complaints = data?.results ?? []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Complaints</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.ward
              ? `Ward ${data.ward} — refreshed from the complaint system`
              : 'Complaints assigned to your ward'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.ward != null && (
            <Badge variant="outline" className="gap-1">
              <MapPin size={12} /> Ward {data.ward}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={refreshing}
          >
            <RefreshCw size={14} className="mr-1" />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && error !== 'auth' && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">
              Complaint system unavailable
            </p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {data?.ward == null && (
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <Inbox size={32} className="mx-auto text-muted-foreground" />
            <p className="font-medium">No ward assigned to your profile</p>
            <p className="text-sm text-muted-foreground">
              Ask the superadmin to set your ward — complaints are matched to
              your ward number, so we cannot fetch any until then.
            </p>
          </CardContent>
        </Card>
      )}

      {data?.ward != null && !error && complaints.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <EmptyIcon size={32} className="mx-auto text-muted-foreground" />
            <p className="font-medium">No complaints in ward {data.ward}</p>
            <p className="text-sm text-muted-foreground">
              Nothing has been logged for your ward yet.
            </p>
          </CardContent>
        </Card>
      )}

      {complaints.length > 0 && (
        <div className="grid gap-3">
          {complaints.map((c: Complaint) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{c.subject}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.reference_number}
                      {c.department ? ` · ${c.department}` : ''}
                      {c.issue_type ? ` · ${c.issue_type}` : ''}
                    </p>
                  </div>
                  <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {c.date_reported && <span>Reported {c.date_reported}</span>}
                  {c.priority && <span>Priority: {c.priority}</span>}
                  {c.area && <span>Area: {c.area}</span>}
                  {c.received_channel && <span>Channel: {c.received_channel}</span>}
                </div>
                {c.description && (
                  <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                    {c.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}