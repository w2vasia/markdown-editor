import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/server'
import { buildStoragePath } from '@/lib/utils'

export default async function PublicDocPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!doc) notFound()

  const path = buildStoragePath(doc.user_id, doc.id)
  const { data: fileData } = await supabase.storage
    .from('documents')
    .download(path)

  const markdownContent = fileData ? await fileData.text() : ''

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-3">
        <span className="font-semibold text-muted-foreground">MarkdownEditor</span>
      </header>
      <main className="container max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-8">{doc.title}</h1>
        <ReactMarkdown>
          {markdownContent}
        </ReactMarkdown>
      </main>
    </div>
  )
}
