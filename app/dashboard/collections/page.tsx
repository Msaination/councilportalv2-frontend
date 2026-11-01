/**
 * Collections page — hierarchical category browser using the recursive tree.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchRootCategories, type Category } from '@/lib/api'
import { CategoryTree } from '@/components/category-tree'
import { Folder, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CollectionsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [filtered, setFiltered] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchRootCategories()
      .then((data) => {
        setCategories(data)
        setFiltered(data)
      })
      .catch((e) => {
        if ((e as Error).message.includes('Not authenticated')) {
          router.push('/login')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!search) {
      setFiltered(categories)
      return
    }
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
    setFiltered(filterRecursive(categories))
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Collections</h1>
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
      </div>

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
