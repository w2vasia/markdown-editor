'use client'

import { useState } from 'react'
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
    const next = !isPublic
    const result = await publishDocument(documentId, next)
    setIsPublic(next)
    setSlug(result.slug)
    setPending(false)
  }

  const shareUrl = slug
    ? `${window.location.origin}/doc/${slug}`
    : null

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
            onClick={() => navigator.clipboard.writeText(shareUrl)}
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
