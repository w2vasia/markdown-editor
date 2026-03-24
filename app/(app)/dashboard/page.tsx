import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DocList } from '@/components/dashboard/doc-list'
import { CreateDocButton } from '@/components/dashboard/create-doc-button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Documents</h1>
        <CreateDocButton />
      </div>
      <DocList documents={documents ?? []} />
    </div>
  )
}
