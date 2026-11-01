/**
 * StarRating — interactive 1–5 star rating widget.
 * Supports read-only display and live rating submission.
 */

'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { postRating } from '@/lib/api'

interface Props {
  fileId: number
  contentTypeId: number
  initialAvg: number | null
  initialCount: number
  editable?: boolean
}

export function StarRating({ fileId, contentTypeId, initialAvg, initialCount, editable = true }: Props) {
  const [avg, setAvg] = useState(initialAvg)
  const [count, setCount] = useState(initialCount)
  const [hover, setHover] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const fullDisplay = avg ? avg : 0

  const handleSubmit = async (value: number) => {
    if (!editable || submitting) return
    setSubmitting(true)
    try {
      await postRating(contentTypeId, fileId, value)
      // Optimistically update
      setAvg((prev) => {
        const newAvg = prev !== null ? (prev + value) / 2 : value
        return Math.round(newAvg * 10) / 10
      })
      setCount((prev) => prev + (prev === 0 ? 1 : 0))
    } catch (err) {
      console.error('Failed to rate:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleSubmit(star)}
            onMouseEnter={() => editable && setHover(star)}
            onMouseLeave={() => setHover(0)}
            disabled={!editable || submitting}
            className={`${
              star <= (hover || fullDisplay)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-gray-300'
            } transition-colors `}
          >
            <Star size={18} />
          </button>
        ))}
      </div>
      {avg !== null && (
        <span className="text-sm text-muted-foreground">
          {avg.toFixed(1)} ({count} review{count !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  )
}
