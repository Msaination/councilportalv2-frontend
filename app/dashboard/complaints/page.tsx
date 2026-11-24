/**
 * My Complaints — ward councillor's complaints, pulled from the CCMS via the
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
  fetchComplaintReplies,
  type Complaint,
  type MyComplaints,
  type ReportReply,
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
  ClipboardList,
  Building,
  Flag,
  MessageSquare,
  Tag,
  Clock,
  ChevronDown,
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

const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Low: 'outline',
  Medium: 'secondary',
  High: 'destructive',
  Urgent: 'destructive',
}

function priorityVariant(priority: string) {
  return PRIORITY_VARIANT[priority] ?? 'secondary'
}

const AREA_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Ward 1': 'outline',
  'Ward 2': 'outline',
  'Ward 3': 'secondary',
  'Ward 4': 'secondary',
}

function areaVariant(area: string) {
  return AREA_VARIANT[area] ?? 'secondary'
}

const CHANNEL_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Call Centre': 'outline',
  'Mobile App': 'secondary',
  'Walk-in': 'default',
}

function channelVariant(channel: string) {
  return CHANNEL_VARIANT[channel] ?? 'secondary'
}

export default function ComplaintsPage() {
  const router = useRouter()
  const [data, setData] = useState<MyComplaints | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<number | null>(null)

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

  function ComplaintReplies({ complaintId }: { complaintId: number }) {
    const [replies, setReplies] = useState<ReportReply[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      fetchComplaintReplies(complaintId)
        .then(setReplies)
        .catch((e) => setError((e as Error).message))
        .finally(() => setLoading(false))
    }, [complaintId])

    if (loading) return <p className="text-sm text-muted-foreground p-4">Loading replies...</p>
    if (error) return <p className="text-sm text-destructive p-4">{error}</p>

    return (
      <div className="p-4 border-t">
        {replies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No replies yet.</p>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => (
              <div
                key={reply.created_at}
                className={`flex items-start gap-2 ${reply.from_staff ? 'justify-end' : ''}`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    reply.from_staff
                      ? 'bg-green-600 text-white'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{reply.body}</p>
                  <p className="text-xs text-green-900 mt-1">
                    {new Date(reply.created_at).toLocaleString()}
                    {' '} - <span className="text-green-800">{reply.author_name}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
        <div className="grid gap-3 sm:grid-cols-2">
          {complaints.map((c: Complaint) => (
            <div
              key={c.id}
              className="rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <button
                className="w-full text-left"
                onClick={() => setSelectedComplaint(selectedComplaint === c.id ? null : c.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{c.subject}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="gap-1 pl-1 pr-2">
                          <ClipboardList size={12} className="text-muted-foreground" />
                          <span className="font-mono text-xs font-normal text-foreground">
                            {c.reference_number}
                          </span>
                        </Badge>
                        {c.department && (
                          <Badge variant="secondary" className="gap-1 pl-1 pr-2">
                            <Building size={12} className="text-muted-foreground" />
                            <span className="text-xs font-normal text-foreground">
                              {c.department}
                            </span>
                          </Badge>
                        )}
                        {c.issue_type && (
                          <Badge variant="secondary" className="gap-1 pl-1 pr-2">
                            <Tag size={12} className="text-muted-foreground" />
                            <span className="text-xs font-normal text-foreground">
                              {c.issue_type}
                            </span>
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                      <ChevronDown
                        className={`transform transition-transform ${
                          selectedComplaint === c.id ? 'rotate-180' : ''
                        }`}
                        size={16}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {c.date_reported && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        Reported{' '}
                        {new Date(c.date_reported).toLocaleString('default', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                          hour12: true,
                        })}
                      </span>
                    )}
                    {c.priority && (
                      <Badge variant={priorityVariant(c.priority)} className="gap-1">
                        <Flag size={12} /> Priority: {c.priority}
                      </Badge>
                    )}
                    {c.area && (
                      <Badge variant={areaVariant(c.area)} className="gap-1">
                        <MapPin size={12} /> Area: {c.area}
                      </Badge>
                    )}
                    {c.received_channel && (
                      <Badge variant={channelVariant(c.received_channel)} className="gap-1">
                        <MessageSquare size={12} /> Channel: {c.received_channel}
                      </Badge>
                    )}
                  </div>
                  {c.description && (
                    <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                      {c.description}
                    </p>
                  )}
                </CardContent>
              </button>
              {selectedComplaint === c.id && <ComplaintReplies complaintId={c.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}