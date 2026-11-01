/**
 * File detail page — shows preview, metadata, comments, ratings, and download.
 * URL: /files/[id]
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchFile, fetchComments, fetchContentTypes, type StoredFile, type Comment, downloadFile, type ContentTypeMap } from '@/lib/api'
import { Preview } from '@/components/preview'
import { StarRating } from '@/components/star-rating'
import { CommentList } from '@/components/comment-list'
import { CommentForm } from '@/components/comment-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, FileText, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatFileSize } from '@/lib/file-types'

// Disable prerendering — useParams() requires runtime context
export const dynamic = 'force-dynamic'

export default function FileDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [file, setFile] = useState<StoredFile | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [contentTypes, setContentTypes] = useState<ContentTypeMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          setContentTypes(ctMap)

          // Fetch existing comments for this file
          const commentList = await fetchComments(ctMap.storedfile, Number(id))
          setComments(commentList)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const handleCommentAdded = (comment: Comment) => {
    setComments((prev) => [comment, ...prev])
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-12">
        <FileText size={48} className="mx-auto mb-2 text-muted-foreground" />
        <p>File not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back button */}
        <Link href={file.category ? `/categories/${file.category.slug}` : '/'}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} className="mr-1" />
        Back
      </Link>

      <article className="space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-foreground">{file.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <FileText size={14} />
              {formatFileSize(file.filesize)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {new Date(file.created).toLocaleDateString()}
            </span>
            <span>{file.mime_type}</span>
          </div>
        </header>

        {/* Rating + Download */}
        <div className="flex items-center justify-between">
          <StarRating
            fileId={file.id}
            contentTypeId={contentTypes?.storedfile ?? 0}
            initialAvg={file.rating_avg}
            initialCount={file.rating_count}
          />
          <Button
            onClick={async () => {
              const res = await downloadFile(file.id)
              if (res.url) window.open(res.url, '_blank')
              else if (file.local_file) window.open(file.local_file, '_blank')
            }}
            disabled={!file.can_download}
          >
            <Download size={16} />
            Download
          </Button>
        </div>

        {/* Description */}
        {file.description && (
          <p className="text-sm text-muted-foreground">{file.description}</p>
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
            contentTypeId={contentTypes?.storedfile ?? 0}
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
