/**
 * Category detail page — shows a category's subcategories and files.
 * URL: /categories/[slug]
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchCategory, type Category, type StoredFile } from '@/lib/api'
import { CategoryTree } from '@/components/category-tree'
import { FileCard } from '@/components/file-card'
import { ArrowLeft, FolderOpen } from 'lucide-react'
import Link from 'next/link'

// Disable prerendering — useParams() requires runtime context
export const dynamic = 'force-dynamic'

export default function CategoryPage() {
  const router = useParams()
  const slug = typeof router.slug === 'string' ? router.slug : ''
  const [category, setCategory] = useState<Category & { files: StoredFile[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-12">
        <FolderOpen size={48} className="mx-auto mb-2 text-muted-foreground" />
        <p>Category not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft size={16} className="mr-1" />
          Back to portal
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{category.title}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-2">{category.description}</p>
        )}
      </div>

      {/* Subcategories */}
      {category.children && category.children.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Subcategories</h2>
          <CategoryTree categories={category.children} />
        </section>
      )}

      {/* Files in this category */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Documents ({category.files?.length || 0})
        </h2>
        {category.files && category.files.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {category.files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No files in this category.</p>
        )}
      </section>
    </div>
  )
}
