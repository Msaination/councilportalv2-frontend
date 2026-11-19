/**
 * FileDropzone — drag-and-drop + click-to-browse, multi-file.
 *
 * Accepts any number of files and hands them to the caller in one batch.
 * Extension filtering mirrors the backend allow-list; skipped files are
 * reported back through `onRejected` so the caller can surface the reason.
 */

'use client'

import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ALLOWED_UPLOAD_EXTENSIONS, fileExtension } from '@/lib/file-types'

interface Props {
  /** Receives the accepted files, in the order they were dropped/selected. */
  onFiles: (files: File[]) => void
  /** Called when some files were filtered out client-side. */
  onRejected?: (message: string) => void
  /** Disables interaction while an upload is in flight. */
  busy?: boolean
  /** Extra guidance shown under the primary label. */
  hint?: string
}

export function FileDropzone({ onFiles, onRejected, busy = false, hint }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = (incoming: File[]) => {
    const accepted: File[] = []
    const rejected: string[] = []

    for (const file of incoming) {
      const ext = fileExtension(file.name)
      if (!ext || !ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
        rejected.push(file.name)
      } else {
        accepted.push(file)
      }
    }

    if (rejected.length > 0) {
      onRejected?.(
        `Skipped ${rejected.length} unsupported file(s): ${rejected.join(', ')}`,
      )
    }
    if (accepted.length > 0) {
      onFiles(accepted)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (busy) return
    setDragging(false)
    accept(Array.from(event.dataTransfer.files ?? []))
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!busy) setDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!busy) inputRef.current?.click()
    }
  }

  const handleBrowse = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = '' // allow re-selecting the same files
    if (picked.length > 0) accept(picked)
  }

  return (
    <div
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-disabled={busy}
      aria-label="Drag files here or click to browse"
      onClick={() => { if (!busy) inputRef.current?.click() }}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-6 py-8 text-center transition-colors',
        dragging
          ? 'border-primary bg-accent text-accent-foreground'
          : 'border-input bg-card hover:bg-accent/60',
        busy && 'pointer-events-none opacity-60',
      )}
    >
      <UploadCloud size={28} className="text-muted-foreground" />
      <p className="text-sm font-medium">
        {busy ? 'Uploading…' : 'Drop files here, or click to browse'}
      </p>
      <p className="text-xs text-muted-foreground">
        {hint ?? 'Multiple files supported'}
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleBrowse}
      />
    </div>
  )
}
