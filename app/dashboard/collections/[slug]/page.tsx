/**
 * Resource category detail — shows a single category's child sections + resources.
 * URL: /dashboard/collections/[slug]
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  fetchCategory, uploadFile, createCategory, deleteFile, deleteFiles,
  canManageContent, type Category, type StoredFile,
} from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { FileCard } from '@/components/file-card'
import { FileDropzone } from '@/components/file-dropzone'
import { ArrowLeft, FolderOpen, FolderPlus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const dynamic = 'force-dynamic'

export default function CollectionPage() {
  const params = useParams()
  const slug = params.slug as string
  const [category, setCategory] = useState<Category & { files: StoredFile[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showUpload, setShowUpload] = useState(false)
  const [showSubfolderForm, setShowSubfolderForm] = useState(false)
  const [subfolderTitle, setSubfolderTitle] = useState('')
  const [creatingSubfolder, setCreatingSubfolder] = useState(false)
  const [subfolderError, setSubfolderError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const { user } = useAuth()
  const canManage = canManageContent(user)

  /** Upload every dropped/selected file, reporting per-file failures. */
  const handleFiles = async (picked: File[]) => {
    if (uploading || picked.length === 0) return
    setUploading(true)
    setActionError(null)
    setUploadProgress({ done: 0, total: picked.length })

    const uploaded: StoredFile[] = []
    const failed: string[] = []

    for (const [index, file] of picked.entries()) {
      try {
        // Assuming StoredFile.name should map to file.name, or use file.title if name is not available on StoredFile
        uploaded.push(
          await uploadFile({ file, category: category?.slug || undefined }),
        )
      } catch (err) {
        failed.push(`${file.name}: ${(err as Error).message}`)
      } finally {
        setUploadProgress({ done: index + 1, total: picked.length })
      }
    }

    if (uploaded.length > 0) {
      // Update category state with new files
      setCategory((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          files: [...uploaded, ...(prev.files || [])],
        };
      });
      setShowUpload(false)
    }
    if (failed.length > 0) {
      setActionError(
        `${failed.length} file(s) failed — ${failed.join('; ')}`,
      )
    }
    setUploading(false)
  }

  const handleCreateSubfolder = async () => {
    const title = subfolderTitle.trim()
    // Safely access category properties
    if (!title || !category || creatingSubfolder) return
    setCreatingSubfolder(true)
    setSubfolderError(null)
    try {
      const created = await createCategory({ title, parent: category.slug })
      setCategory((prev) =>
        prev ? { ...prev, children: [...(prev.children || []), created] } : prev)
      setSubfolderTitle('')
      setShowSubfolderForm(false)
    } catch (err) {
      setSubfolderError((err as Error).message)
    } finally {
      setCreatingSubfolder(false)
    }
  }

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  /** Delete one or many files after confirmation, then drop them locally. */
  const removeFiles = async (ids: number[]) => {
    if (!canManage || deleting || ids.length === 0 || !category) return
    const label = ids.length === 1 ? 'this file' : `these ${ids.length} files`
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return

    setDeleting(true)
    setActionError(null)
    try {
      if (ids.length === 1) {
        await deleteFile(ids[0])
      } else {
        await deleteFiles(ids)
      }
      setCategory((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          files: prev.files.filter((file) => !ids.includes(file.id)),
        };
      });
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.delete(id)
        return next
      })
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchCategory(slug)
        if (!cancelled) setCategory(data)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-7 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
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

  // Safely render if category is null
  if (!category) {
    return (
      <div className="p-6 text-center py-12">
        <FolderOpen size={48} className="mx-auto mb-2 text-muted-foreground" />
        <p>Folder not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back */}
      <Link href="/dashboard#resources" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} className="mr-1" />
        Back to files
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{category.title}</h1>
          {category.description && (
            <p className="text-muted-foreground mt-1">{category.description}</p>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              disabled={uploading || creatingSubfolder}
              onClick={() => {
                setShowSubfolderForm((open) => !open)
                setSubfolderError(null)
              }}
            >
              <FolderPlus size={16} className="mr-1" />
              New subfolder
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={selectedIds.size === 0 || deleting || uploading}
              onClick={() => void removeFiles([...selectedIds])}
              aria-label={`Delete ${selectedIds.size} selected files`}
            >
              <Trash2 size={16} className="mr-1" />
              {deleting ? 'Deleting…' : `Delete (${selectedIds.size})`}
            </Button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
          {actionError}
        </div>
      )}

      {canManage && (
        <div className="space-y-1">
          <FileDropzone
            onFiles={(files) => void handleFiles(files)}
            onRejected={setActionError}
            busy={uploading}
            hint={`Files are added to "${category.title}"`}
          />
          {uploading && uploadProgress.total > 0 && (
            <p className="text-xs text-muted-foreground">
              Uploading {uploadProgress.done}/{uploadProgress.total}…
            </p>
          )}
        </div>
      )}

      {canManage && showSubfolderForm && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <Input
              placeholder="Subfolder name (e.g. 2026 Minutes)"
              value={subfolderTitle}
              onChange={(e) => setSubfolderTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateSubfolder() }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Created inside &ldquo;{category.title}&rdquo;.
            </p>
            {subfolderError && (
              <p className="text-sm text-destructive">{subfolderError}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handleCreateSubfolder()}
                disabled={creatingSubfolder || !subfolderTitle.trim()}
              >
                {creatingSubfolder ? 'Creating…' : 'Create subfolder'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowSubfolderForm(false); setSubfolderError(null) }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subfolders */}
      {((category.children && category.children.length > 0) || showSubfolderForm) && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Subfolders</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(category.children ?? []).map((child) => (
              <Link
                key={child.id}
                href={`/dashboard/collections/${child.slug}`}
                className="block rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={20} className="text-muted-foreground" />
                  <span className="font-medium">{child.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {child.total_file_count} files
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Files */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Files ({category.total_file_count || 0})
        </h2>
        {category.files && category.files.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {category.files.map((file) => (
            <FileCard
            key={file.id}
            file={file}
            selectable={canManage}
            selected={selectedIds.has(file.id)}
            onSelectChange={(checked) => toggleSelected(file.id, checked)}
            onDelete={canManage ? () => void removeFiles([file.id]) : undefined}
            deleting={deleting}
          />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No files in this folder.</p>
        )}
      </section>
    </div>
  )
}
