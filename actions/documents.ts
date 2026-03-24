'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateSlug, buildStoragePath } from '@/lib/utils'
import type { DocumentUpdate } from '@/types/database'

export async function createDocument(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('documents')
    .insert({ user_id: user.id, title: 'Untitled' })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  redirect(`/editor/${data.id}`)
}

export async function updateDocument(
  id: string,
  updates: DocumentUpdate,
  content?: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error: dbError } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)

  if (dbError) throw new Error(dbError.message)

  if (content !== undefined) {
    const path = buildStoragePath(user.id, id)
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(path, content, {
        contentType: 'text/markdown',
        upsert: true,
      })
    if (storageError) throw new Error(storageError.message)
  }

  revalidatePath(`/editor/${id}`)
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const path = buildStoragePath(user.id, id)

  // Storage removal is best-effort (file may not exist if doc was never saved)
  await supabase.storage.from('documents').remove([path])

  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}

export async function publishDocument(
  id: string,
  isPublic: boolean
): Promise<{ slug: string | null }> {
  const supabase = await createClient()
  const slug = isPublic ? generateSlug() : null

  const { data, error } = await supabase
    .from('documents')
    .update({ is_public: isPublic, slug })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath(`/editor/${id}`)
  return { slug: data.slug }
}

export async function getDocumentContent(
  userId: string,
  documentId: string
): Promise<string> {
  const supabase = await createClient()
  const path = buildStoragePath(userId, documentId)

  const { data, error } = await supabase.storage
    .from('documents')
    .download(path)

  if (error) return ''
  return await data.text()
}
