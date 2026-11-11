/**
 * Asset detail page — preview, metadata, comments, ratings, download.
 * URL: /dashboard/assets/[id]
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchFile, deleteFile, canManageContent, type StoredFile, type Comment, downloadFile, downloadFileBlob } from '@/lib/api'
import { fetchComments, fetchContentTypes, createShareLink, type Comment as CommentType, type SharedLink } from '@/lib/api'
import { Preview } from '@/components/preview'
import { StarRating } from '@/components/star-rating'
import { CommentList } from '@/components/comment-list'
import { CommentForm } from '@/components/comment-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth-provider'
import {
  ArrowLeft, Download, FileText, Calendar, Share2, Copy, Check, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { formatFileSize } from '@/lib/file-types'

export const dynamic = 'force-dynamic'

export default function AssetDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { user } = useAuth()
  const canShare = user?.capabilities.share_files ?? false
  const canManage = canManageContent(user)
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [file, setFile] = useState<StoredFile | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [ctId, setCtId] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showShare, setShowShare] = useState(false)
  const [expiryHours, setExpiryHours] = useState('168')
  const [sharePassword, setSharePassword] = useState('')
  const [share, setShare] = useState<SharedLink | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [creatingShare, setCreatingShare] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [fileData, ctMap] = await Promise.all([
          fetchFile(id),
          fetchContentTypes(),
        ])
        if (!cancelled) {
          setFile(fileData)
          setCtId(ctMap.storedfile)
        }
        const commentList = await fetchComments(ctMap.storedfile, Number(id))
        if (!cancelled) setComments(commentList)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const handleCommentAdded = (comment: CommentType) => {
    setComments((prev) => [comment, ...prev])
  }

  const handleCreateShare = async () => {
    if (!file) return
    const hours = expiryHours.trim() === '' ? null : Number(expiryHours)
    if (hours !== null && (!Number.isFinite(hours) || hours < 0)) {
      setShareError('Expiry must be a non-negative number of hours.')
      return
    }
    setCreatingShare(true)
    setShareError(null)
    try {
      setShare(await createShareLink(file.id, {
        expiresInHours: hours,
        password: sharePassword,
      }))
    } catch (e) {
      setShareError((e as Error).message)
    } finally {
      setCreatingShare(false)
    }
  }

  const handleCopyShare = async () => {
    if (!share) return
    await navigator.clipboard.writeText(
      `${window.location.origin}/share/${share.token}`,
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = async () => {
    if (!file) return
    setDownloadError(null)
    try {
      if (file.storage === 'external') {
        const res = await downloadFile(file.id)
        if (res.url) window.open(res.url, '_blank')
        return
      }

      const blob = await downloadFileBlob(file.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.local_file.split('/').pop() || file.slug
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setDownloadError((e as Error).message)
    }
  }

  const handleDelete = async () => {
    if (!file || deleting) return
    if (!window.confirm(`Delete "${file.title}"? This cannot be undone.`)) {
      return
    }
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteFile(file.id)
      router.push('/dashboard/assets')
    } catch (e) {
      setDeleteError((e as Error).message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="p-6 text-center py-12">
        <FileText size={48} className="mx-auto mb-2 text-muted-foreground" />
        <p>Asset not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link href="/dashboard/assets" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} className="mr-1" />
        Back to assets
      </Link>

      <article className="space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{file.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{file.preview_kind}</Badge>
              <span>•</span>
              <span>{formatFileSize(file.filesize)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(file.created).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canShare && (
              <Button
                variant="outline"
                onClick={() => setShowShare((value) => !value)}
              >
                <Share2 size={16} />
                Share
              </Button>
            )}
            <Button
              onClick={handleDownload}
              disabled={!file.can_download}
            >
              <Download size={16} />
              Download
            </Button>
            {canManage && (
              <Button
                variant="destructive"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </div>
        </header>

        {(downloadError || deleteError) && (
          <p className="text-sm text-destructive">{downloadError || deleteError}</p>
        )}

        {/* Rating + Tags */}
        <div className="flex items-center gap-4">
          <StarRating
            fileId={file.id}
            contentTypeId={ctId}
            initialAvg={file.rating_avg}
            initialCount={file.rating_count}
          />
          <Badge variant={file.is_published ? 'default' : 'secondary'}>
            {file.is_published ? 'Published' : 'Draft'}
          </Badge>
        </div>

        {/* Description */}
        {file.description && (
          <p className="text-sm text-muted-foreground">{file.description}</p>
        )}

        {/* Share */}
        {showShare && canShare && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Share2 size={18} /> Share with a client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {share ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Anyone with this link can access the file
                    {share.has_password ? ' after entering the password' : ''}.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/share/${share.token}`}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button variant="outline" onClick={handleCopyShare}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {share.expires_at
                      ? `Expires ${new Date(share.expires_at).toLocaleString()}`
                      : 'Never expires'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShare(null)}
                  >
                    Create another link
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Expires in hours (blank = never)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={expiryHours}
                        onChange={(e) => setExpiryHours(e.target.value)}
                        disabled={creatingShare}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Password (optional)
                      </label>
                      <Input
                        value={sharePassword}
                        onChange={(e) => setSharePassword(e.target.value)}
                        disabled={creatingShare}
                      />
                    </div>
                  </div>
                  {shareError && (
                    <p className="text-sm text-destructive">{shareError}</p>
                  )}
                  <Button onClick={handleCreateShare} disabled={creatingShare}>
                    {creatingShare ? 'Creating...' : 'Create share link'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Preview</h2>
          <Preview file={file} />
        </section>

        {/* Comments */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Comments ({comments.length + file.comment_count})
          </h2>
          <CommentForm
            contentTypeId={ctId}
            objectId={file.id}
            onSubmit={handleCommentAdded}
          />
          <div className="mt-6">
            <CommentList comments={comments} />
          </div>
        </section>
      </article>
    </div>
  )
}
