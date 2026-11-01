/**
 * API client for the Emalahleni Council Portal.
 *
 * Handles:
 * - JWT auth (djangorestframework-simplejwt) for API-first / SaaS usage
 * - Session cookie auth for browser-based flows
 * - CSRF token management for session auth
 * - Base URL from NEXT_PUBLIC_API_URL env var
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Token storage ──────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

function setTokens(access: string, refresh: string | null) {
  if (typeof window === 'undefined') return
  localStorage.setItem('access_token', access)
  if (refresh) localStorage.setItem('refresh_token', refresh)
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refresh_token')
}

function clearTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
}

// ─── Auth helpers ───────────────────────────────────────────

/** Exchange credentials for JWT tokens. */
export async function loginJwt(
  username: string,
  password: string,
): Promise<boolean> {
  const resp = await fetch(`${BASE_URL}/api/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!resp.ok) return false
  const data = await resp.json()
  setTokens(data.access, data.refresh)
  return true
}

/** Refresh the access token using the refresh token. */
async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null
  const resp = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!resp.ok) {
    clearTokens()
    return null
  }
  const data = await resp.json()
  setTokens(data.access, data.refresh || refresh)
  return data.access
}

export async function logoutJwt(): Promise<void> {
  clearTokens()
}

export async function checkJwtAuth(): Promise<User | null> {
  const token = getAccessToken()
  if (!token) return null
  try {
    return await apiFetch<User>('/api/auth/me/')
  } catch {
    const newToken = await refreshAccessToken()
    if (!newToken) return null
    return await apiFetch<User>('/api/auth/me/')
  }
}

/** Generic DRF paginated response. */
interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

function isPaginated(data: unknown): data is PaginatedResponse<unknown> {
  return typeof data === 'object' && data !== null &&
    'results' in data && Array.isArray((data as PaginatedResponse<unknown>).results)
}

/** Fetch with JWT auth header. Returns parsed JSON (unwraps DRF pagination). */
async function apiFetch<T>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  let token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Authorization: `Bearer ${token}`,
    ...(opts.headers as Record<string, string> || {}),
  }

  const resp = await fetch(`${BASE_URL}${path}`, { ...opts, headers })

  // Retry with refreshed token on 401
  if (resp.status === 401 && !(opts.headers as Record<string, string>)?.['x-retry']) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      token = newToken
      const retryResp = await fetch(`${BASE_URL}${path}`, {
        ...opts,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      })
      if (!retryResp.ok) {
        throw new Error(`API: ${retryResp.status}`)
      }
      const text = await retryResp.text()
      const json = text ? JSON.parse(text) : {}
      return (isPaginated(json) ? json.results : json) as T
    }
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(`API: ${resp.status} ${err.detail || ''}`)
  }

  const text = await resp.text()
  if (!text) return {} as T
  const json = JSON.parse(text)
  return (isPaginated(json) ? json.results : json) as T
}

// ─── Typed API functions ─────────────────────────────────────

export interface Category {
  id: number
  title: string
  slug: string
  description: string
  is_published: boolean
  ordering: number
  children: Category[]
  file_count: number
  can_view: boolean
}

export interface StoredFile {
  id: number
  title: string
  slug: string
  description: string
  storage: 'local' | 'external'
  local_file: string
  external_url: string
  filesize: number
  mime_type: string
  is_published: boolean
  download_count: number
  created: string
  modified: string
  preview_kind: 'pdf' | 'image' | 'audio' | 'video' | 'download'
  can_download: boolean
  rating_avg: number | null
  rating_count: number
  comment_count: number
  category?: { id: number; title: string; slug: string }
}

export interface Comment {
  id: number
  user: User
  text: string
  is_approved: boolean
  created: string
}

export interface Rating {
  id: number
  user: User
  value: number
}

export interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  groups: string[]
  is_staff: boolean
  avatar: string
  capabilities: Capabilities
  active_team: ActiveTeam | null
  must_change_password: boolean
}

export interface Capabilities {
  view_teams: boolean
  share_files: boolean
  edit_employee_numbers: boolean
  manage_access: boolean
}

export interface ActiveTeam {
  id: number
  name: string
  slug: string
}

export interface UploadLog {
  id: number
  file: string
  user: User
  action: 'created' | 'replaced'
  uploaded_at: string
}

export interface DownloadLog {
  id: number
  file: string
  user: User | null
  ip_address: string | null
  downloaded_at: string
}

export interface StatsSummary {
  total_downloads: number
  total_uploads: number
  top_files: { id: number; title: string; download_count: number }[]
}

// ─── Content type resolution ───────────────────────────────

export interface ContentTypeMap {
  storedfile: number
  category: number
}

export async function fetchContentTypes(): Promise<ContentTypeMap> {
  return apiFetch<ContentTypeMap>('/api/files/content-types/')
}

// ─── Category endpoints ─────────────────────────────────────

export async function fetchRootCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories/')
}

export async function fetchCategory(slug: string): Promise<Category & {
  files: StoredFile[]
}> {
  return apiFetch<Category & { files: StoredFile[] }>(`/api/categories/${slug}/`)
}

// ─── File endpoints ─────────────────────────────────────────

export async function fetchFiles(category?: string): Promise<StoredFile[]> {
  const qs = category ? `?category=${category}` : ''
  return apiFetch<StoredFile[]>(`/api/files/${qs}`)
}

export async function fetchFile(id: string | number): Promise<StoredFile> {
  return apiFetch<StoredFile>(`/api/files/${id}/`)
}

export async function downloadFile(id: number): Promise<{ url?: string }> {
  return apiFetch<{ url?: string }>(`/api/files/${id}/download/`)
}

/** Download a local file's bytes with JWT auth (endpoint streams, not JSON). */
export async function downloadFileBlob(id: number): Promise<Blob> {
  const request = (token: string) => fetch(
    `${BASE_URL}/api/files/${id}/download/`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  let response = await request(token)
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) throw new Error('Not authenticated')
    response = await request(refreshed)
  }
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`)
  }
  return response.blob()
}

// ─── Comment endpoints ─────────────────────────────────────

export async function fetchComments(
  contentTypeId: number,
  objectId: number,
): Promise<Comment[]> {
  return apiFetch<Comment[]>(
    `/api/comments/?content_type=${contentTypeId}&object_id=${objectId}`,
  )
}

export async function postComment(
  contentTypeId: number,
  objectId: number,
  text: string,
): Promise<Comment> {
  return apiFetch<Comment>('/api/comments/', {
    method: 'POST',
    body: JSON.stringify({ content_type: contentTypeId, object_id: objectId, text }),
  })
}

// ─── Rating endpoints ──────────────────────────────────────

export async function postRating(
  contentTypeId: number,
  objectId: number,
  value: number,
): Promise<Rating> {
  return apiFetch<Rating>('/api/ratings/', {
    method: 'POST',
    body: JSON.stringify({ content_type: contentTypeId, object_id: objectId, value }),
  })
}

// ─── Admin stats ───────────────────────────────────────────

export async function fetchStatsSummary(): Promise<StatsSummary> {
  return apiFetch<StatsSummary>('/api/admin/stats/summary/')
}

export async function fetchDownloadLogs(): Promise<DownloadLog[]> {
  return apiFetch<DownloadLog[]>('/api/admin/stats/downloads/')
}

export async function fetchUploadLogs(): Promise<UploadLog[]> {
  return apiFetch<UploadLog[]>('/api/admin/stats/uploads/')
}

// ─── Shared links ──────────────────────────────────────────

export interface SharedLinkFile {
  id: number
  title: string
  description: string
  storage: 'local' | 'external'
  external_url: string
  filesize: number
  mime_type: string
  preview_kind: 'pdf' | 'image' | 'audio' | 'video' | 'download'
}

export interface SharedLink {
  token: string
  file: SharedLinkFile
  created_by: User | null
  created_at: string
  expires_at: string | null
  has_password: boolean
  is_active: boolean
}

export async function createShareLink(
  fileId: number,
  options: { expiresInHours?: number | null; password?: string } = {},
): Promise<SharedLink> {
  return apiFetch<SharedLink>(`/api/files/${fileId}/share/`, {
    method: 'POST',
    body: JSON.stringify({
      expires_in_hours: options.expiresInHours,
      password: options.password ?? '',
    }),
  })
}

export async function fetchShareLinks(): Promise<SharedLink[]> {
  return apiFetch<SharedLink[]>('/api/shared-links/')
}

export async function revokeShareLink(token: string): Promise<void> {
  await apiFetch(`/api/shared-links/${token}/`, { method: 'DELETE' })
}

/** Thrown when a share link needs (or has the wrong) password. */
export class SharePasswordRequiredError extends Error {
  constructor() {
    super('Password required')
    this.name = 'SharePasswordRequiredError'
  }
}

/** Public URL of a share's payload; inline=true streams for preview. */
export function sharedDownloadUrl(
  token: string,
  password?: string,
  inline = false,
): string {
  const params = new URLSearchParams()
  if (password) params.set('password', password)
  if (inline) params.set('inline', '1')
  const qs = params.toString()
  return `${BASE_URL}/api/shared/${token}/download/${qs ? `?${qs}` : ''}`
}

/** Fetch a public share (no JWT required). */
export async function fetchSharedLink(
  token: string,
  password?: string,
): Promise<SharedLink> {
  const params = new URLSearchParams()
  if (password) params.set('password', password)
  const qs = params.toString()
  const resp = await fetch(`${BASE_URL}/api/shared/${token}/${qs ? `?${qs}` : ''}`)

  if (resp.status === 401) {
    const data = await resp.json().catch(() => ({}))
    if (data.password_required) throw new SharePasswordRequiredError()
  }
  if (!resp.ok) throw new Error('This share link is invalid or has expired.')
  return resp.json()
}

// ─── Teams (multi-tenancy) ─────────────────────────────────

export type TeamRole = 'owner' | 'admin' | 'member'

export interface TeamMember {
  user_id: number
  username: string
  role: TeamRole
  joined_at: string
}

export interface Team {
  id: number
  name: string
  slug: string
  created_at: string
  role: TeamRole | null
  member_count: number
  members: TeamMember[]
}

export async function fetchTeams(): Promise<Team[]> {
  return apiFetch<Team[]>('/api/teams/')
}

export async function fetchTeam(slug: string): Promise<Team> {
  return apiFetch<Team>(`/api/teams/${slug}/`)
}

export async function createTeam(name: string): Promise<Team> {
  return apiFetch<Team>('/api/teams/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function switchTeam(slug: string): Promise<Team> {
  return apiFetch<Team>(`/api/teams/${slug}/switch/`, { method: 'POST' })
}

export async function addTeamMember(
  slug: string,
  username: string,
): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/api/teams/${slug}/members/`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
}

export async function removeTeamMember(
  slug: string,
  userId: number,
): Promise<void> {
  await apiFetch(`/api/teams/${slug}/members/${userId}/`, {
    method: 'DELETE',
  })
}

// ─── Access control (superadmin) ───────────────────────────

export interface UserAccess {
  id: number
  username: string
  email: string
  employee_number: string | null
  must_change_password: boolean
  is_superuser: boolean
  capabilities: {
    view_teams: boolean
    share_files: boolean
    edit_employee_numbers: boolean
  }
}

export const DEFAULT_NEW_USER_PASSWORD = 'Password#v2cp2026'

export interface CreateUserPayload {
  username: string
  email: string
  employee_number: string
}

export async function createUser(data: CreateUserPayload): Promise<UserAccess> {
  return apiFetch<UserAccess>('/api/access/users/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchUserAccess(): Promise<UserAccess[]> {
  return apiFetch<UserAccess[]>('/api/access/users/')
}

export interface UserAccessChanges {
  view_teams?: boolean
  share_files?: boolean
  edit_employee_numbers?: boolean
  employee_number?: string
}

export async function updateUserAccess(
  userId: number,
  changes: UserAccessChanges,
): Promise<UserAccess> {
  return apiFetch<UserAccess>(`/api/access/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}

// ─── Own profile ───────────────────────────────────────────

export interface Profile {
  id: number
  username: string
  email: string
  employee_number: string | null
  cell_number: string
  bio: string
  avatar: string | null
}

export async function fetchProfile(): Promise<Profile> {
  return apiFetch<Profile>('/api/profile/')
}

export interface ProfileUpdate {
  username?: string
  email?: string
  cell_number?: string
  bio?: string
  avatar?: File
}

export async function updateProfile(data: ProfileUpdate): Promise<Profile> {
  const form = new FormData()
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue
    form.append(key, value)
  }
  return apiFetch<Profile>('/api/profile/', { method: 'PATCH', body: form })
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiFetch('/api/profile/password/', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  })
}

// ─── Calendar ──────────────────────────────────────────────

export type MeetingScope = 'mine' | 'all'

export interface Meeting {
  id: number
  title: string
  description: string
  location: string
  starts_at: string
  ends_at: string | null
  team: number | null
  team_name: string
  category: number | null
  category_title: string | null
  category_slug: string | null
  file: number | null
  file_title: string | null
  attendees: number[]
  attendee_names: string[]
  groups: number[]
  group_names: string[]
  is_mine: boolean
  created_at: string
}

export interface MeetingPayload {
  title: string
  description?: string
  location?: string
  starts_at: string
  ends_at?: string | null
  team?: number | null
}

export async function fetchMeetings(
  scope: MeetingScope = 'all',
  includePast = false,
  date?: string,
): Promise<Meeting[]> {
  const params = new URLSearchParams()
  if (scope === 'mine') params.set('scope', 'mine')
  if (includePast) params.set('include_past', '1')
  if (date) params.set('date', date)
  const qs = params.toString()
  return apiFetch<Meeting[]>(`/api/meetings/${qs ? `?${qs}` : ''}`)
}

export async function fetchMeeting(id: number): Promise<Meeting> {
  return apiFetch<Meeting>(`/api/meetings/${id}/`)
}

export async function createMeeting(payload: MeetingPayload): Promise<Meeting> {
  return apiFetch<Meeting>('/api/meetings/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteMeeting(id: number): Promise<void> {
  await apiFetch(`/api/meetings/${id}/`, { method: 'DELETE' })
}