/**
 * Public share page — password-gated preview/download for a shared file.
 * URL: /share/[token]
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  fetchSharedLink,
  sharedDownloadUrl,
  SharePasswordRequiredError,
  type SharedLink,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileText, Lock } from 'lucide-react'
import { formatFileSize } from '@/lib/file-types'

function SharedPreview({
  link,
  password,
}: {
  link: SharedLink
  password: string
}) {
  const { file, token } = link
  const src =
    file.storage === 'external'
      ? file.external_url
      : sharedDownloadUrl(token, password, true)

  switch (file.preview_kind) {
    case 'pdf':
      return (
        <div className="border rounded-lg overflow-hidden">
          <iframe src={src} className="w-full h-[600px]" title={file.title} />
        </div>
      )
    case 'image':
      return (
        <div className="border rounded-lg overflow-hidden bg-muted/30">
          <img src={src} alt={file.title} className="max-w-full h-auto mx-auto" />
        </div>
      )
    case 'audio':
      return (
        <div className="border rounded-lg p-4 bg-muted/30">
          <audio controls className="w-full">
            <source src={src} type={file.mime_type || 'audio/mpeg'} />
            Your browser does not support the audio element.
          </audio>
        </div>
      )
    case 'video':
      return (
        <div className="border rounded-lg overflow-hidden bg-black">
          <video controls className="w-full h-auto">
            <source src={src} type={file.mime_type || 'video/mp4'} />
            Your browser does not support the video element.
          </video>
        </div>
      )
    default:
      return (
        <div className="text-center py-12 border rounded-lg">
          <FileText size={64} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {formatFileSize(file.filesize)} • {file.mime_type}
          </p>
        </div>
      )
  }
}

export default function SharedFilePage() {
  const params = useParams()
  const token = params.token as string
  const [link, setLink] = useState<SharedLink | null>(null)
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const handleLoadError = (e: unknown, suppliedPassword = '') => {
    if (e instanceof SharePasswordRequiredError) {
      setNeedsPassword(true)
      if (suppliedPassword) setError('Incorrect password.')
    } else {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    fetchSharedLink(token)
      .then((data) => {
        if (cancelled) return
        setLink(data)
        setNeedsPassword(false)
        setLoading(false)
      })
      .catch((e) => {
        if (!cancelled) handleLoadError(e)
      })
    return () => { cancelled = true }
  }, [token])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      setLink(await fetchSharedLink(token, password))
      setNeedsPassword(false)
    } catch (err) {
      handleLoadError(err, password)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-primary" />
            </div>
            <CardTitle className="text-xl">Protected file</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Enter the password to view this shared file.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
                  {error}
                </div>
              )}
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
              <Button type="submit" className="w-full">
                Unlock
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !link) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="py-10">
            <FileText size={48} className="mx-auto mb-3 text-muted-foreground" />
            <h1 className="text-lg font-semibold mb-1">Link unavailable</h1>
            <p className="text-sm text-muted-foreground">
              {error || 'This share link is invalid or has expired.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const downloadHref =
    link.file.storage === 'external'
      ? link.file.external_url
      : sharedDownloadUrl(link.token, password)

  return (
    <div className="flex-1 p-6 max-w-3xl w-full mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{link.file.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatFileSize(link.file.filesize)}
            {link.expires_at
              ? ` • link expires ${new Date(link.expires_at).toLocaleString()}`
              : ''}
          </p>
        </div>
        <Button asChild>
          <a href={downloadHref} download>
            <Download size={16} />
            Download
          </a>
        </Button>
      </header>

      {link.file.description && (
        <p className="text-sm text-muted-foreground">{link.file.description}</p>
      )}

      <SharedPreview link={link} password={password} />
    </div>
  )
}
