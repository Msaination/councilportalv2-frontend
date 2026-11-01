/**
 * Shared links page — list and revoke client share links.
 * URL: /dashboard/shared
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchShareLinks, revokeShareLink, type SharedLink } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, FileText, Link2, Trash2 } from 'lucide-react'
import { formatFileSize } from '@/lib/file-types'

export default function SharedLinksPage() {
  const [links, setLinks] = useState<SharedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchShareLinks()
      .then(setLinks)
      .catch((e) => {
        if ((e as Error).message.includes('Not authenticated')) {
          router.push('/login')
        } else {
          setError((e as Error).message)
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleRevoke = async (token: string) => {
    try {
      await revokeShareLink(token)
      setLinks((prev) =>
        prev.map((link) =>
          link.token === token ? { ...link, is_active: false } : link,
        ),
      )
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Shared Links</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Time-limited links you created for clients. Create new links from an
          asset&apos;s detail page.
        </p>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-destructive/10 text-destructive text-sm rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 size={18} /> Active and past links
          </CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Link2 size={40} className="mx-auto mb-2" />
              <p className="mb-3">No share links yet.</p>
              <Link href="/dashboard/assets" className="text-primary underline">
                Go to assets
              </Link>
            </div>
          ) : (
            <ul className="divide-y">
              {links.map((link) => (
                <li
                  key={link.token}
                  className="py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="shrink-0" />
                      <Link
                        href={`/dashboard/assets/${link.file.id}`}
                        className="font-medium truncate hover:underline"
                      >
                        {link.file.title}
                      </Link>
                      <Badge variant={link.is_active ? 'default' : 'secondary'}>
                        {link.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {link.has_password && (
                        <Badge variant="outline">Password</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(link.file.filesize)} • created{' '}
                      {new Date(link.created_at).toLocaleDateString()} •{' '}
                      {link.expires_at
                        ? `expires ${new Date(link.expires_at).toLocaleDateString()}`
                        : 'never expires'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(link.token)}
                    >
                      <Copy size={14} />
                      {copiedToken === link.token ? 'Copied' : 'Copy link'}
                    </Button>
                    {link.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(link.token)}
                      >
                        <Trash2 size={14} />
                        Revoke
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
