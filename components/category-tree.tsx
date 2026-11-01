/**
 * Category tree browser — recursive component.
 * Displays the hierarchical category structure with file counts.
 * Collapsible nodes, ACL-aware (only shows items the user can view).
 */

'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Category } from '@/lib/api'
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react'

interface Props {
  categories: Category[]
}

export function CategoryTree({ categories }: Props) {
  return (
    <nav className="space-y-1">
      {categories.map((cat) => (
        <CategoryNode key={cat.id} category={cat} depth={0} />
      ))}
    </nav>
  )
}

function CategoryNode({ category, depth }: { category: Category; depth: number }) {
  const [open, setOpen] = useState(depth < 2) // auto-expand top 2 levels
  const hasChildren = category.children?.length > 0

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded px-2 py-1 group"
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
          {open && hasChildren ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {open ? <FolderOpen size={14} /> : <Folder size={14} />}
        </span>

        <Link
          href={`/categories/${category.slug}`}
          className="flex-1 text-sm font-medium hover:text-primary transition-colors"
        >
          {category.title}
        </Link>

        {category.file_count > 0 && (
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {category.file_count} file{category.file_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {hasChildren && open && (
        <div className="space-y-1">
          {category.children.map((child) => (
            <CategoryNode key={child.id} category={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
