/**
 * Assets management page — grid + table view with filters.
 */

'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  fetchFiles, fetchRootCategories, uploadFile, canManageContent,
  type Category, type StoredFile,
} from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { FileCard } from '@/components/file-card'
import {
  LayoutGrid,
  List,
  Filter,
  SortAsc,
  SortDesc,
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

export default function AssetsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const canManage = canManageContent(user)
  const [assets, setAssets] = useState<StoredFile[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortKey>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)

  // Upload panel (admin/staff only)
  const [categories, setCategories] = useState<Category[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchFiles()
      .then(setAssets)
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

  const handlePickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!picked || !uploadCategory || uploading) return
    void doUpload(picked)
  }

  const doUpload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const uploaded = await uploadFile({ file, category: uploadCategory })
      setAssets((prev) => [uploaded, ...prev])
      setShowUpload(false)
      setUploadCategory('')
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const sorted = [...assets].sort((a, b) => {
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
          <h1 className="text-2xl font-bold">Assets</h1>
          {canManage && (
            <Button
              size="sm"
              onClick={() => { setShowUpload(!showUpload); setUploadError(null) }}
            >
              <Upload size={16} className="mr-1" />
              Upload asset
            </Button>
          )}
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
              <DropdownMenuItem>Documents</DropdownMenuItem>
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
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label htmlFor="upload-category" className="text-sm font-medium">
                  Collection
                </label>
                <select
                  id="upload-category"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                >
                  <option value="">Choose a collection…</option>
                  {flattenCategories(categories).map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => handlePickFile(e)}
              />
              <Button
                size="sm"
                disabled={!uploadCategory || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Uploading…' : 'Choose file'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowUpload(false); setUploadError(null) }}
              >
                Cancel
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
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Modified</th>
                  <th className="px-4 py-3 text-right">Downloads</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((file) => (
                  <tr key={file.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <a
                        href={`/dashboard/assets/${file.id}`}
                        className="font-medium text-sm hover:text-primary"
                      >
                        {file.title}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {file.preview_kind}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {file.filesize ? `${Math.round(file.filesize / 1024)} KB` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(file.modified).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {file.download_count}
                    </td>
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
