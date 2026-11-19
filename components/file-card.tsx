/**
 * FileCard — compact card preview for a single document.
 * Shows title, type icon, size, rating, and download button.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { StoredFile } from '@/lib/api'
import { downloadFile, downloadFileBlob } from '@/lib/api'
import { getPreviewKind, formatFileSize } from '@/lib/file-types'
import { Download, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  file: StoredFile
  /** Show a selection checkbox for bulk actions. */
  selectable?: boolean
  selected?: boolean
  onSelectChange?: (selected: boolean) => void
  /** Show a per-file delete button when the caller allows it. */
  onDelete?: () => void
  deleting?: boolean
}

export function FileCard({
  file, selectable = false, selected = false, onSelectChange,
  onDelete, deleting = false,
}: Props) {
  const kind = getPreviewKind(file.local_file || file.external_url)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
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
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card className="group">
      <CardHeader>
        <div className="flex items-start gap-2">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onSelectChange?.(event.target.checked)}
              aria-label={`Select ${file.title}`}
              className="mt-1 h-4 w-4 accent-primary"
            />
          )}
          <CardTitle className="flex-1">
            <Link href={`/files/${file.id}`} className="hover:text-primary transition-colors">
              {file.title}
            </Link>
          </CardTitle>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              disabled={deleting}
              aria-label={`Delete ${file.title}`}
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className="uppercase">{kind}</span>
          <span>•</span>
          <span>{formatFileSize(file.filesize)}</span>
          <span>•</span>
          <span className="truncate">{file.category?.title ?? 'Root Files'}</span>
        </div>

        {file.rating_count > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">
              {file.rating_avg?.toFixed(1)} ({file.rating_count})
            </span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading || !file.can_download}
          className="w-full"
        >
          <Download size={14} />
          {downloading ? 'Downloading...' : 'Download'}
        </Button>
      </CardContent>
    </Card>
  )
}

// FileCard component
