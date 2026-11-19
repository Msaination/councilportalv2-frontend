/**
 * File type detection helpers for the Emalahleni Council Portal.
 *
 * Maps file extensions to a "preview kind" that determines which UI
 * component renders.  The same mapping runs server-side (Django) and
 * client-side (Next.js) so both stay in sync.
 */

export type PreviewKind = 'pdf' | 'image' | 'audio' | 'video' | 'download'

// Must match PREVIEW_MAP in documents/serializers.py
const EXT_MAP: Record<string, PreviewKind> = {
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  m4a: 'audio',
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  avi: 'video',
}

/** Derive the preview kind from a filename or URL. */
export function getPreviewKind(filename: string): PreviewKind {
  if (!filename) return 'download'
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext && ext in EXT_MAP ? EXT_MAP[ext] : 'download'
}

/** Lower-cased extension without the dot, or '' when there is none. */
export function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase()
}

/**
 * Mirrors StoredFileViewSet.ALLOWED_EXTENSIONS in documents/views.py so the
 * dropzone can reject unsupported files before uploading them.
 */
export const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'zip', 'rar', '7z',
  'png', 'jpg', 'jpeg', 'gif', 'webp',
  'mp3', 'wav', 'ogg', 'mp4', 'webm',
])

/** Icon name for a given filename (for fallback display). */
export function getFileIcon(filename: string): string {
  const kind = getPreviewKind(filename)
  switch (kind) {
    case 'pdf':
      return 'doc-pdf'
    case 'image':
      return 'photo'
    case 'audio':
      return 'musical-note'
    case 'video':
      return 'film'
    default:
      return 'document-text'
  }
}

/** Human-readable file size. */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/** Check if a file can be previewed inline. */
export function canPreview(filename: string): boolean {
  return getPreviewKind(filename) !== 'download'
}

/** Check if a file can be played/streamed in-browser. */
export function canPlay(filename: string): boolean {
  const kind = getPreviewKind(filename)
  return kind === 'audio' || kind === 'video'
}
