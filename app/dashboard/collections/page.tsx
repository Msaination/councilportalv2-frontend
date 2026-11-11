/**
 * Collections page — hierarchical category browser using the recursive tree.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  fetchRootCategories, createCategory, canManageContent, type Category,
} from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { CategoryTree } from '@/components/category-tree'
import { Folder, Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CollectionsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const router = useRouter()
  const { user } = useAuth()
  const canManage = canManageContent(user)

  const handleCreate = async () => {
    const title = newTitle.trim()
    if (!title || creating) return
    setCreating(true)
    setFormError(null)
    try {
      const created = await createCategory({ title })
      setCategories((prev) => [...prev, created])
      setNewTitle('')
      setShowNewForm(false)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    fetchRootCategories()
      .then(setCategories)
      .catch((e) => {
        if ((e as Error).message.includes('Not authenticated')) {
          router.push('/login')
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  /** Search filter, derived during render instead of via an effect. */
  const filtered = useMemo(() => {
    if (!search) return categories
    const term = search.toLowerCase()
    const filterRecursive = (cats: Category[]): Category[] =>
      cats
        .map((cat) => {
          const match = cat.title.toLowerCase().includes(term) ||
                        cat.description?.toLowerCase().includes(term)
          const children = cat.children ? filterRecursive(cat.children) : []
          if (match || children.length > 0) {
            return { ...cat, children: children.length > 0 ? children : cat.children }
          }
          return null
        })
        .filter(Boolean) as Category[]
    return filterRecursive(categories)
  }, [search, categories])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse h-6 bg-muted rounded w-48" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Collections</h1>
        <div className="flex items-center gap-2">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="search"
              placeholder="Search collections..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canManage && (
            <Button
              size="sm"
              onClick={() => { setShowNewForm(!showNewForm); setFormError(null) }}
            >
              <Plus size={16} className="mr-1" />
              New collection
            </Button>
          )}
        </div>
      </div>

      {canManage && showNewForm && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <Input
              placeholder="Collection title (e.g. Council Minutes 2026)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate() }}
              autoFocus
            />
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handleCreate()}
                disabled={creating || !newTitle.trim()}
              >
                {creating ? 'Creating…' : 'Create'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowNewForm(false); setFormError(null) }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Tree</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryTree categories={filtered} />
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12">
          <Folder size={48} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            No collections match your search.
          </p>
        </div>
      )}
    </div>
  )
}
