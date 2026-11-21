/**
 * File management page — grid + table view with filters.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  fetchFiles, fetchRootCategories, uploadFile, deleteFile, deleteFiles,
  canManageContent, type Category, type StoredFile,
} from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { FileCard } from '@/components/file-card'
import { FileDropzone } from '@/components/file-dropzone'
import {
  LayoutGrid,
  List,
  Filter,
  SortAsc,
  SortDesc,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

type ViewMode = 'grid' | 'table'
type SortKey = 'title' | 'created' | 'download_count'
type SortDir = 'asc' | 'desc'

export default function FilesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const canManage = canManageContent(user)
  const [files, setFiles] = useState<StoredFile[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortKey>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)

  // Upload panel (admin/staff only)
  const [categories, setCategories] = useState<Category[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchFiles()
      .then(setFiles)
      .catch((e) => {
        if ((e as Error).message.includes('Not authenticated')) {
          router.push('/login')
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    if (!canManage) return
    fetchRootCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [canManage])

  /** Flatten the category tree so the picker shows hierarchy via indentation. */
  const flattenCategories = (
    cats: Category[],
    depth = 0,
  ): { slug: string; label: string }[] =>
    cats.flatMap((cat) => [
      { slug: cat.slug, label: `${'  '.repeat(depth)}${cat.title}` },
      ...flattenCategories(cat.children || [], depth + 1),
    ])

  /** Upload every dropped/selected file, reporting per-file failures. */
  const handleFiles = async (picked: File[]) => {
    if (uploading || picked.length === 0) return
    setUploading(true)
    setUploadError(null)
    setUploadProgress({ done: 0, total: picked.length })

    const uploaded: StoredFile[] = []
    const failed: string[] = []

    for (const [index, file] of picked.entries()) {
      try {
        uploaded.push(
          await uploadFile({ file, category: uploadCategory || undefined }),
        )
      } catch (err) {
        failed.push(`${file.name}: ${(err as Error).message}`)
      } finally {
        setUploadProgress({ done: index + 1, total: picked.length })
      }
    }

    if (uploaded.length > 0) {
      setFiles((prev) => [...uploaded, ...prev])
      setShowUpload(false)
    }
    if (failed.length > 0) {
      setUploadError(
        `${failed.length} file(s) failed — ${failed.join('; ')}`,
      )
    }
    setUploading(false)
  }

  const sorted = [...files].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'title') {
      cmp = a.title.localeCompare(b.title)
    } else if (sortBy === 'download_count') {
      cmp = a.download_count - b.download_count
    } else {
      cmp = new Date(a.created).getTime() - new Date(b.created).getTime()
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }

  const allSelected = sorted.length > 0 &&
    sorted.every((file) => selectedIds.has(file.id))

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(
      checked ? new Set(sorted.map((file) => file.id)) : new Set(),
    )
  }

  /** Delete one or many files after confirmation, then drop them locally. */
  const removeFiles = async (ids: number[]) => {
    if (!canManage || deleting || ids.length === 0) return
    const label = ids.length === 1 ? 'this file' : `these ${ids.length} files`
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return

    setDeleting(true)
    setUploadError(null)
    try {
      if (ids.length === 1) {
        await deleteFile(ids[0])
      } else {
        await deleteFiles(ids)
      }
      setFiles((prev) => prev.filter((file) => !ids.includes(file.id)))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.delete(id)
        return next
      })
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Files</h1>
          {canManage && sorted.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                aria-label="Select all files"
              />
              Select all
            </label>
          )}
          {canManage && selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              disabled={deleting}
              onClick={() => void removeFiles([...selectedIds])}
              aria-label={`Delete ${selectedIds.size} selected files`}
            >
              <Trash2 size={16} className="mr-1" />
              {deleting ? 'Deleting…' : `Delete (${selectedIds.size})`}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => { setShowUpload(!showUpload); setUploadError(null) }}
            disabled={uploading}
          >
            <Upload size={16} className="mr-1" />
            {uploading ? 'Uploading…' : 'Choose file'}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort: {sortBy}
                {sortDir === 'asc' ? <SortAsc size={14} className="ml-1" /> : <SortDesc size={14} className="ml-1" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => toggleSort('title')}>Name</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('created')}>Date</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('download_count')}>Downloads</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter size={14} className="mr-1" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>All files</DropdownMenuItem>
              <DropdownMenuItem>Images</DropdownMenuItem>
              <DropdownMenuItem>Resources</DropdownMenuItem>
              <DropdownMenuItem>Media</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={16} />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Upload panel (admin/staff) */}
      {canManage && showUpload && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1">
              <label htmlFor="upload-category" className="text-sm font-medium">
                File category (optional)
              </label>
              <select
                id="upload-category"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                disabled={uploading}
              >
                <option value="">— None (root Files) —</option>
                {flattenCategories(categories).map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <FileDropzone
              onFiles={(files) => void handleFiles(files)}
              onRejected={setUploadError}
              busy={uploading}
              hint={uploadCategory
                ? `Files are added to the selected category`
                : 'Files are added to the root Files area'}
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {uploading && uploadProgress.total > 0
                  ? `Uploading ${uploadProgress.done}/${uploadProgress.total}…`
                  : 'Choose a category above, then drop files onto the area.'}
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => { setShowUpload(false); setUploadError(null) }}
              >
                Done
              </Button>
            </div>

            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((file) => (
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
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground uppercase">
                  {canManage && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={allSelected}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        aria-label="Select all files"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Modified</th>
                  <th className="px-4 py-3 text-right">Downloads</th>
                  {canManage && <th className="px-4 py-3 w-10" />}
                </tr>
              </thead>
              <tbody>
                {sorted.map((file) => (
                  <tr key={file.id} className="border-b last:border-0">
                    {canManage && (
                      <td className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selectedIds.has(file.id)}
                          onChange={(e) => toggleSelected(file.id, e.target.checked)}
                          aria-label={`Select ${file.title}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 pr-4 truncate max-w-xs">{file.title}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {file.preview_kind}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {file.filesize ? `${Math.round(file.filesize / 1024)} KB` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(file.modified).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {file.download_count}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => void removeFiles([file.id])}
                          disabled={deleting}
                          aria-label={`Delete ${file.title}`}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
