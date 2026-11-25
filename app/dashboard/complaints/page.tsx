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
  createComplaint,
  escalateComplaint,
  fetchMyComplaints,
  fetchComplaintReplies,
  type Complaint,
  type MyComplaints,
  type ReportReply,
} from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Plus,
  ArrowUpCircle,
  Loader2,
  X,
} from 'lucide-react'

/** A complaint may be escalated only once it has been open this long.
 *  Mirrors ESCALATION_WINDOW_HOURS in python/complaints/client.py — the
 *  server is authoritative and re-checks on every escalation. */
const ESCALATION_WINDOW_HOURS = 72
const HOURS_TO_MS = 60 * 60 * 1000

/** Statuses that are already past the point of escalating. The CMS stores
 *  lowercase camel-style values (submitted, inProgress, closed, resolved). */
const FINAL_STATUSES = new Set(['resolved', 'closed'])

/** Escalation raises priority to 'urgent' — the CMS has no 'escalated'
 *  status, and `priority` is the only column that signals urgency. */
const ESCALATED_PRIORITY = 'urgent'

function hoursOpen(complaint: Complaint): number | null {
  const stamp = complaint.date_reported || complaint.created_at
  if (!stamp) return null
  const opened = new Date(stamp).getTime()
  if (Number.isNaN(opened)) return null
  return (Date.now() - opened) / HOURS_TO_MS
}

/** Can this complaint be escalated right now? */
function isEscalatable(complaint: Complaint): boolean {
  if (FINAL_STATUSES.has((complaint.status || '').toLowerCase())) return false
  if ((complaint.priority || '').toLowerCase() === ESCALATED_PRIORITY) {
    return false
  }
  const age = hoursOpen(complaint)
  return age !== null && age >= ESCALATION_WINDOW_HOURS
}

/** Categories that exist on the live complaints table. */
const COMPLAINT_CATEGORIES = [
  'Water',
  'Electricity',
  'Waste & refuse',
  'Sanitation',
  'Roads & stormwater',
  'Billing & accounts',
  'Housing',
  'Emergency & disaster',
  'Public safety & by-laws',
  'Community facilities',
  'Parks & cemeteries',
  'Other',
]

/** CMS status lifecycle (§6.7) → badge variant. The CMS stores lowercase
 *  camel-style values; older Title Case spellings are tolerated too. */
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  submitted: 'outline',
  received: 'outline',
  new: 'outline',
  assigned: 'secondary',
  inprogress: 'secondary',
  resolved: 'default',
  completed: 'default',
  closed: 'default',
}

function statusVariant(status: string) {
  if (!status) return 'secondary'
  return STATUS_VARIANT[status.toLowerCase().replace(/[\s_-]/g, '')] ?? 'secondary'
}

const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  normal: 'outline',
  urgent: 'destructive',
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

const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
] as const

type ComplaintPriority = typeof PRIORITIES[number]['value']

function NewComplaintForm({
  ward,
  onCreated,
  onCancel,
}: {
  ward: number
  onCreated: (referenceNumber: string) => Promise<void> | void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0])
  const [issueType, setIssueType] = useState('')
  const [department, setDepartment] = useState('')
  const [address, setAddress] = useState('')
  const [priority, setPriority] = useState<ComplaintPriority>('normal')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const created = await createComplaint({
        title,
        description,
        category,
        location_address: address,
        issue_type: issueType || undefined,
        assigned_department: department || undefined,
        priority,
      })
      await onCreated(created.reference_number || 'submitted')
    } catch (e) {
      setFormError((e as Error).message.replace('API: ', ''))
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Log a complaint for ward {ward}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
          <div>
            <label htmlFor="complaint-title" className="text-sm font-medium block mb-1">
              Subject
            </label>
            <Input
              id="complaint-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Burst water pipe on Kromdraai Road"
              maxLength={200}
              required
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="complaint-description" className="text-sm font-medium block mb-1">
              Description
            </label>
            <textarea
              id="complaint-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              required
              disabled={saving}
              className={fieldClass}
              placeholder="What is wrong, and where?"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="complaint-category" className="text-sm font-medium block mb-1">
                Category
              </label>
              <select
                id="complaint-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={saving}
                className={fieldClass}
              >
                {COMPLAINT_CATEGORIES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="complaint-issue" className="text-sm font-medium block mb-1">
                Issue type
              </label>
              <Input
                id="complaint-issue"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                placeholder="e.g. Burst pipe"
                maxLength={100}
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="complaint-department" className="text-sm font-medium block mb-1">
                Department
              </label>
              <Input
                id="complaint-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Optional"
                maxLength={100}
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="complaint-address" className="text-sm font-medium block mb-1">
                Location
              </label>
              <Input
                id="complaint-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street or stand number"
                maxLength={255}
                required
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="complaint-priority" className="text-sm font-medium block mb-1">
                Priority
              </label>
              <select
                id="complaint-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                disabled={saving}
                className={fieldClass}
              >
                {PRIORITIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={saving || !title.trim() || !description.trim() || !address.trim()}
            >
              {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
              {saving ? 'Submitting…' : 'Submit complaint'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ComplaintsPage() {
  const router = useRouter()
  const [data, setData] = useState<MyComplaints | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<number | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [escalatingId, setEscalatingId] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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

  const handleEscalate = async (complaint: Complaint) => {
    setEscalatingId(complaint.id)
    setError(null)
    setNotice(null)
    try {
      await escalateComplaint(complaint.id)
      setNotice(
        `${complaint.reference_number} escalated — priority raised to urgent.`,
      )
      await load()
    } catch (e) {
      setError((e as Error).message.replace('API: ', ''))
    } finally {
      setEscalatingId(null)
    }
  }

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
          {data?.ward != null && (
            <Button
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => {
                setShowNewForm((open) => !open)
                setNotice(null)
              }}
            >
              {showNewForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
              {showNewForm ? 'Cancel' : 'New Complaint'}
            </Button>
          )}
        </div>
      </div>

      {showNewForm && data?.ward != null && (
        <NewComplaintForm
          ward={data.ward}
          onCreated={async (reference) => {
            setShowNewForm(false)
            setNotice(`Complaint ${reference} logged for ward ${data.ward}.`)
            await load()
          }}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {notice && (
        <div className="p-3 bg-green-600/10 text-green-700 text-sm rounded-lg">
          {notice}
        </div>
      )}

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
              {isEscalatable(c) && (
                <div className="px-4 pb-3 -mt-1">
                  <Button
                    size="sm"
                    className="w-full bg-orange-500 text-white hover:bg-orange-600"
                    disabled={escalatingId === c.id}
                    onClick={() => void handleEscalate(c)}
                  >
                    {escalatingId === c.id ? (
                      <Loader2 size={14} className="mr-1 animate-spin" />
                    ) : (
                      <ArrowUpCircle size={14} className="mr-1" />
                    )}
                    {escalatingId === c.id
                      ? 'Escalating…'
                      : `Escalate (open ${Math.floor(hoursOpen(c) ?? 0)}h)`}
                  </Button>
                </div>
              )}
              {selectedComplaint === c.id && <ComplaintReplies complaintId={c.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}