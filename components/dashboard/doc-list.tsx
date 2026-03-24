'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { deleteDocument } from '@/actions/documents'
import type { Document } from '@/types/database'

export function DocList({ documents }: { documents: Document[] }) {
  const [, startTransition] = useTransition()

  if (documents.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No documents yet. Create one to get started.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
        >
          <Link href={`/editor/${doc.id}`} className="flex-1 min-w-0">
            <p className="font-medium truncate">{doc.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
              {doc.is_public && (
                <span className="ml-2 text-green-600">• Public</span>
              )}
            </p>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive ml-2"
            onClick={() =>
              startTransition(async () => {
                try {
                  await deleteDocument(doc.id)
                } catch {
                  toast.error('Failed to delete document')
                }
              })
            }
          >
            Delete
          </Button>
        </li>
      ))}
    </ul>
  )
}
