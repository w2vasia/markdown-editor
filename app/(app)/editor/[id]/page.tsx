import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TipTapEditor } from '@/components/editor/tiptap-editor'
import { PublishToggle } from '@/components/editor/publish-toggle'
import { getDocumentContent } from '@/actions/documents'
import { Button } from '@/components/ui/button'

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!doc) notFound()

  const content = await getDocumentContent(user.id, id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard"><Button variant="ghost" size="sm">← Dashboard</Button></Link>
        <PublishToggle
          documentId={id}
          initialIsPublic={doc.is_public}
          initialSlug={doc.slug}
        />
      </div>
      <TipTapEditor
        documentId={id}
        initialTitle={doc.title}
        initialContent={content}
      />
    </div>
  )
}
