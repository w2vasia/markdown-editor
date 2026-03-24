'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createDocument } from '@/actions/documents'

export function CreateDocButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      onClick={() => startTransition(() => createDocument())}
      disabled={pending}
    >
      {pending ? 'Creating…' : '+ New document'}
    </Button>
  )
}
