/**
 * Collection detail — shows a single collection's children + files.
 * URL: /dashboard/collections/[slug]
 */

'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  fetchCategory, uploadFile, deleteCategory, canManageContent,
  type Category, type StoredFile,
} from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { FileCard } from '@/components/file-card'
import { ArrowLeft, FolderOpen, Upload, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default function CollectionPage() {
  const params = useParams()
  const slug = params.slug as string
  const [category, setCategory] = useState<Category & { files: StoredFile[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { user } = useAuth()
  const canManage = canManageContent(user)

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!picked || !category || busy) return
    setBusy(true)
    setActionError(null)
    try {
      const uploaded = await uploadFile({ file: picked, category: category.slug })
      setCategory((prev) =>
        prev ? { ...prev, files: [uploaded, ...(prev.files || [])] } : prev)
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!category || busy) return
    const fileCount = category.files?.length ?? 0
    const childCount = category.children?.length ?? 0
    const extras = fileCount || childCount
      ? ` This also removes ${fileCount} asset(s) and ${childCount} subcollection(s).`
      : ''
    if (!window.confirm(`Delete "${category.title}"?${extras}`)) return
    setBusy(true)
    setActionError(null)
    try {
      await deleteCategory(category.slug)
      router.push('/dashboard/collections')
    } catch (err) {
      setActionError((err as Error).message)
      setBusy(false)
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

  if (!category) {
    return (
      <div className="p-6 text-center py-12">
        <FolderOpen size={48} className="mx-auto mb-2 text-muted-foreground" />
        <p>Collection not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back */}
      <Link href="/dashboard/collections" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} className="mr-1" />
        Back to collections
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
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => void handleUpload(e)}
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} className="mr-1" />
              {busy ? 'Working…' : 'Upload asset'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => void handleDelete()}
            >
              <Trash2 size={16} className="mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
          {actionError}
        </div>
      )}

      {/* Subcollections */}
      {category.children && category.children.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Subcollections</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/dashboard/collections/${child.slug}`}
                className="block p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={20} className="text-muted-foreground" />
                  <span className="font-medium">{child.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {child.file_count} assets
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Files */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Assets ({category.files?.length || 0})
        </h2>
        {category.files && category.files.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {category.files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No assets in this collection.</p>
        )}
      </section>
    </div>
  )
}
