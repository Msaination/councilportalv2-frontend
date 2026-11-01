/** Portal root page — displays the ACL-aware category tree. */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CategoryTree } from '@/components/category-tree'
import { fetchRootCategories, checkJwtAuth, type Category } from '@/lib/api'
import { FolderTree, Search, LogIn } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PortalPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Redirect authenticated users to dashboard
    checkJwtAuth().then((user) => {
      if (user) {
        router.replace('/dashboard')
      }
    })

    fetchRootCategories()
      .then(setCategories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/emalahleni-logo.png" alt="Emalahleni" className="h-10 w-10" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Emalahleni Council Portal
            </h1>
            <p className="text-muted-foreground mt-1">
              Document repository for Councillors and Top Management
            </p>
          </div>
        </div>
        <Link href="/login">
          <Button>
            <LogIn size={16} />
            Sign In
          </Button>
        </Link>
      </header>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="search"
          placeholder="Search documents..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
          disabled
        />
      </div>

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderTree size={32} className="mx-auto mb-2" />
          <p>Loading category tree...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && categories.length > 0 && (
        <CategoryTree categories={categories} />
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderTree size={32} className="mx-auto mb-2" />
          <p>No categories available.</p>
        </div>
      )}
    </div>
  )
}
