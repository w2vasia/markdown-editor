'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { publishDocument } from '@/actions/documents'

interface PublishToggleProps {
  documentId: string
  initialIsPublic: boolean
  initialSlug: string | null
}

export function PublishToggle({
  documentId,
  initialIsPublic,
  initialSlug,
}: PublishToggleProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [slug, setSlug] = useState(initialSlug)
  const [pending, setPending] = useState(false)

  const toggle = async () => {
    setPending(true)
    try {
      const next = !isPublic
      const result = await publishDocument(documentId, next)
      setIsPublic(next)
      setSlug(result.slug)
      toast.success(next ? 'Document published' : 'Document unpublished')
    } catch (err) {
      console.error('publish error:', err)
      toast.error('Failed to update publish status')
    } finally {
      setPending(false)
    }
  }

  const shareUrl = slug ? `/doc/${slug}` : null

  return (
    <div className="flex items-center gap-3">
      {isPublic && shareUrl && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            className="text-sm border rounded px-2 py-1 w-64 bg-muted"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const url = `${window.location.origin}/doc/${slug!}`
              if (navigator.clipboard) {
                navigator.clipboard.writeText(url)
              } else {
                const el = document.createElement('textarea')
                el.value = url
                document.body.appendChild(el)
                el.select()
                document.execCommand('copy')
                document.body.removeChild(el)
              }
            }}
          >
            Copy
          </Button>
        </div>
      )}
      <Button
        variant={isPublic ? 'destructive' : 'default'}
        size="sm"
        onClick={toggle}
        disabled={pending}
      >
        {pending ? '…' : isPublic ? 'Unpublish' : 'Publish'}
      </Button>
    </div>
  )
}
