/**
 * CommentForm — submit a new comment on a file or category.
 */

'use client'

import { useState } from 'react'
import { postComment, type Comment } from '@/lib/api'
import { Send } from 'lucide-react'

interface Props {
  contentTypeId: number
  objectId: number
  onSubmit?: (comment: Comment) => void
}

export function CommentForm({ contentTypeId, objectId, onSubmit }: Props) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const comment = await postComment(contentTypeId, objectId, text)
      setText('')
      onSubmit?.(comment)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your thoughts..."
        rows={3}
        className="w-full resize-y min-h-[60px]"
        disabled={submitting}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50"
        >
          <Send size={16} />
          {submitting ? 'Posting...' : 'Post comment'}
        </button>
      </div>
    </form>
  )
}
