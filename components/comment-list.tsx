/**
 * CommentList — shows approved comments for a file or category.
 */

import type { Comment } from '@/lib/api'
import { User as UserIcon } from 'lucide-react'

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  comments: Comment[]
}

export function CommentList({ comments }: Props) {
  if (!comments.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No comments yet. Be the first to share your thoughts!
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((c) => (
        <div key={c.id} className="border-l-2 pl-3">
          <div className="flex items-center gap-2 mb-1">
            <UserIcon size={16} className="text-muted-foreground" />
            <span className="font-medium text-sm">{c.user.username}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(c.created)}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{c.text}</p>
        </div>
      ))}
    </div>
  )
}
