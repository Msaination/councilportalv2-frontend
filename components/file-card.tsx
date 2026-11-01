/**
 * FileCard — compact card preview for a single document.
 * Shows title, type icon, size, rating, and download button.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { StoredFile } from '@/lib/api'
import { downloadFile } from '@/lib/api'
import { getPreviewKind, formatFileSize } from '@/lib/file-types'
import { Download, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  file: StoredFile
}

export function FileCard({ file }: Props) {
  const kind = getPreviewKind(file.local_file || file.external_url)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await downloadFile(file.id)
      if (res.url) window.open(res.url, '_blank')
      else if (file.local_file) window.open(file.local_file, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card className="group">
      <CardHeader>
        <CardTitle>
          <Link href={`/files/${file.id}`} className="hover:text-primary transition-colors">
            {file.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className="uppercase">{kind}</span>
          <span>•</span>
          <span>{formatFileSize(file.filesize)}</span>
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
