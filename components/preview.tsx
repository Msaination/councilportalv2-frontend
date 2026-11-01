/**
 * Preview — renders the correct inline component based on file type.
 *
 * - PDF  → browser PDF viewer (<iframe>)
 * - Image → <img> with object-fit
 * - Audio → HTML5 <audio> player
 * - Video → HTML5 <video> player
 * - Other → download button with file icon
 */

import type { StoredFile } from '@/lib/api'
import { getPreviewKind, formatFileSize } from '@/lib/file-types'
import { Download, FileText } from 'lucide-react'

interface Props {
  file: StoredFile
}

export function Preview({ file }: Props) {
  const kind = getPreviewKind(file.local_file || file.external_url)
  const src = file.storage === 'external' ? file.external_url : file.local_file

  if (!src) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText size={48} className="mx-auto mb-2" />
        <p>No file available for preview.</p>
      </div>
    )
  }

  switch (kind) {
    case 'pdf':
      return (
        <div className="border rounded-lg overflow-hidden">
          <iframe
            src={src}
            className="w-full h-[600px]"
            title={file.title}
          />
        </div>
      )

    case 'image':
      return (
        <div className="border rounded-lg overflow-hidden bg-muted/30">
          <img
            src={src}
            alt={file.title}
            className="max-w-full h-auto mx-auto"
          />
        </div>
      )

    case 'audio':
      return (
        <div className="border rounded-lg p-4 bg-muted/30">
          <audio controls className="w-full">
            <source src={src} type={file.mime_type || 'audio/mpeg'} />
            Your browser does not support the audio element.
          </audio>
        </div>
      )

    case 'video':
      return (
        <div className="border rounded-lg overflow-hidden bg-black">
          <video controls className="w-full h-auto" poster="">
            <source src={src} type={file.mime_type || 'video/mp4'} />
            Your browser does not support the video element.
          </video>
        </div>
      )

    default:
      return (
        <div className="text-center py-12 border rounded-lg">
          <FileText size={64} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">{file.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {formatFileSize(file.filesize)} • {file.mime_type}
          </p>
          <a
            href={src}
            download
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
          >
            <Download size={16} />
            Download file
          </a>
        </div>
      )
  }
}
