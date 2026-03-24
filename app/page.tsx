import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
      <h1 className="text-5xl font-bold tracking-tight">MarkdownEditor</h1>
      <p className="text-xl text-muted-foreground max-w-md">
        Write in a beautiful WYSIWYG editor. Share your documents with a single link.
      </p>
      <div className="flex gap-3">
        <Button render={<Link href="/register" />}>Get started</Button>
        <Button variant="outline" render={<Link href="/login" />}>Sign in</Button>
      </div>
    </div>
  )
}
