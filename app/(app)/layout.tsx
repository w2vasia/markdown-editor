import { logout } from '@/actions/auth'
import { Button } from '@/components/ui/button'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <span className="font-semibold">MarkdownEditor</span>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">Sign out</Button>
        </form>
      </header>
      <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
        {children}
      </main>
    </div>
  )
}
