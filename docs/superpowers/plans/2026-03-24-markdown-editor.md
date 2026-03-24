# Markdown Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js WYSIWYG markdown editor SaaS with Supabase auth, document storage, and public sharing via unique links.

**Architecture:** Next.js 14 App Router with server components and server actions. Supabase handles auth (email/password), PostgreSQL for document metadata, and Storage for `.md` file content. TipTap provides WYSIWYG editing with markdown serialization.

**Tech Stack:** Next.js 14, TypeScript, Supabase (@supabase/ssr), TipTap, Tailwind CSS, shadcn/ui, nanoid, Vitest

---

## File Map

| File | Responsibility |
|------|---------------|
| `middleware.ts` | Protect `/dashboard` and `/editor` routes, refresh Supabase session |
| `lib/supabase/client.ts` | Browser-side Supabase client (singleton) |
| `lib/supabase/server.ts` | Server-side Supabase client (per-request, uses cookies) |
| `lib/utils.ts` | `cn()` class merger, `debounce()`, `generateSlug()` |
| `types/database.ts` | TypeScript types for DB tables |
| `supabase/migrations/001_documents.sql` | Create `documents` table + RLS policies |
| `actions/auth.ts` | `register`, `login`, `logout` server actions |
| `actions/documents.ts` | `createDocument`, `updateDocument`, `deleteDocument`, `publishDocument` |
| `app/layout.tsx` | Root layout, fonts, global CSS |
| `app/page.tsx` | Landing page |
| `app/(auth)/login/page.tsx` | Login page (renders LoginForm) |
| `app/(auth)/register/page.tsx` | Register page (renders RegisterForm) |
| `app/(app)/layout.tsx` | App shell layout (sidebar/nav) |
| `app/(app)/dashboard/page.tsx` | Lists user documents, create button |
| `app/(app)/editor/[id]/page.tsx` | Loads doc, renders TipTap editor |
| `app/doc/[slug]/page.tsx` | Public read-only markdown view |
| `components/auth/login-form.tsx` | Email/password login form |
| `components/auth/register-form.tsx` | Email/password register form |
| `components/dashboard/doc-list.tsx` | Document list with delete action |
| `components/dashboard/create-doc-button.tsx` | Button that calls `createDocument` action |
| `components/editor/tiptap-editor.tsx` | TipTap WYSIWYG editor with auto-save |
| `components/editor/publish-toggle.tsx` | Toggle publish state, show share link |

---

### Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.env.local.example`

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/wasiliy/Documents/Projects/markdown-editor
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --use-npm
```

Expected: Next.js project files created in current directory.

- [ ] **Step 2: Install Supabase + auth deps**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 3: Install TipTap deps**

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-markdown
```

Note: `@tiptap/extension-markdown` adds `.getMarkdown()` and markdown paste support.

- [ ] **Step 4: Install remaining deps**

```bash
npm install nanoid
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 5: Install shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted: TypeScript=yes, style=Default, base color=Neutral, CSS variables=yes.

- [ ] **Step 6: Add shadcn components we'll use**

```bash
npx shadcn@latest add button input label card dropdown-menu separator toast
```

- [ ] **Step 7: Create `.env.local.example`**

```bash
# Create this file at project root
```

Content:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Also copy to `.env.local` and fill in real values from your Supabase project dashboard (Settings → API).

- [ ] **Step 8: Configure vitest**

Add to `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "scaffold: next.js + supabase + tiptap + shadcn"
```

---

### Task 2: Utilities and types

**Files:**
- Create: `lib/utils.ts`, `types/database.ts`
- Test: `lib/__tests__/utils.test.ts`

- [ ] **Step 1: Write failing tests for utils**

Create `lib/__tests__/utils.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { debounce, generateSlug } from '../utils'

describe('debounce', () => {
  it('delays function execution', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    debounced()
    debounced()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})

describe('generateSlug', () => {
  it('returns a non-empty string', () => {
    const slug = generateSlug()
    expect(typeof slug).toBe('string')
    expect(slug.length).toBeGreaterThan(0)
  })

  it('generates unique slugs', () => {
    const slugs = new Set(Array.from({ length: 10 }, generateSlug))
    expect(slugs.size).toBe(10)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run lib/__tests__/utils.test.ts
```

Expected: FAIL — `debounce` and `generateSlug` not defined.

- [ ] **Step 3: Implement utils**

Create `lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { nanoid } from 'nanoid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function generateSlug(): string {
  return nanoid(10)
}
```

Note: shadcn/ui already adds `clsx` and `tailwind-merge` — they're available.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run lib/__tests__/utils.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Create database types**

Create `types/database.ts`:
```typescript
export type Document = {
  id: string
  user_id: string
  title: string
  slug: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at'>
export type DocumentUpdate = Partial<Omit<Document, 'id' | 'user_id' | 'created_at'>>
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "add utils, db types, and tests"
```

---

### Task 3: Supabase clients and database migration

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `supabase/migrations/001_documents.sql`

- [ ] **Step 1: Create browser Supabase client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server Supabase client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — cookies will be set by middleware
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create database migration**

Create `supabase/migrations/001_documents.sql`:
```sql
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null default 'Untitled',
  slug        text unique,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS: users can only see/edit their own documents
alter table documents enable row level security;

create policy "Users can view own documents"
  on documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on documents for delete
  using (auth.uid() = user_id);

-- Anyone can view public documents by slug
create policy "Anyone can view public documents"
  on documents for select
  using (is_public = true);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_updated_at
  before update on documents
  for each row execute procedure update_updated_at();
```

**To run this migration:** Go to your Supabase project dashboard → SQL Editor → paste and run this SQL.

- [ ] **Step 4: Create Supabase Storage bucket**

In Supabase dashboard → Storage → Create bucket named `documents` with:
- Public bucket: **off** (private)
- File size limit: 10MB

Add storage RLS policies via SQL Editor:
```sql
-- Users can upload/update their own document files
create policy "Users can upload own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own documents"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

Note: Storage files are stored as `{user_id}/{document_id}.md` within the `documents` bucket (path = `user_id/doc_id.md`, so `foldername(name)[1]` = `user_id` — correct for the RLS policies above).

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "add supabase clients and db migration"
```

---

### Task 4: Middleware (route protection)

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware**

Create `middleware.ts` at project root:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard', '/editor']
  const isProtected = protectedPaths.some(p =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from auth pages
  if (user && (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')
  )) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "add route protection middleware"
```

---

### Task 5: Auth server actions

**Files:**
- Create: `actions/auth.ts`
- Test: `actions/__tests__/auth.test.ts`

- [ ] **Step 1: Write failing test for auth validation**

Create `actions/__tests__/auth.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { validateAuthInput } from '../auth'

describe('validateAuthInput', () => {
  it('rejects empty email', () => {
    const result = validateAuthInput('', 'password123')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/email/i)
  })

  it('rejects invalid email format', () => {
    const result = validateAuthInput('notanemail', 'password123')
    expect(result.valid).toBe(false)
  })

  it('rejects short password', () => {
    const result = validateAuthInput('user@example.com', '123')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/password/i)
  })

  it('accepts valid credentials', () => {
    const result = validateAuthInput('user@example.com', 'password123')
    expect(result.valid).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run actions/__tests__/auth.test.ts
```

Expected: FAIL — `validateAuthInput` not found.

- [ ] **Step 3: Implement auth actions**

Create `actions/auth.ts`:
```typescript
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthResult = { error: string } | { success: true }

export function validateAuthInput(
  email: string,
  password: string
): { valid: boolean; error?: string } {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: 'Valid email is required' }
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' }
  }
  return { valid: true }
}

export async function register(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const validation = validateAuthInput(email, password)
  if (!validation.valid) return { error: validation.error! }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function login(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const validation = validateAuthInput(email, password)
  if (!validation.valid) return { error: validation.error! }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run actions/__tests__/auth.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "add auth server actions with validation"
```

---

### Task 6: Document server actions

**Files:**
- Create: `actions/documents.ts`
- Test: `actions/__tests__/documents.test.ts`

- [ ] **Step 1: Write failing test**

Create `actions/__tests__/documents.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { buildStoragePath } from '../documents'

describe('buildStoragePath', () => {
  it('returns correct storage path', () => {
    const path = buildStoragePath('user-123', 'doc-456')
    expect(path).toBe('user-123/doc-456.md')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run actions/__tests__/documents.test.ts
```

Expected: FAIL — `buildStoragePath` not found.

- [ ] **Step 3: Implement document actions**

Create `actions/documents.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils'
import type { DocumentUpdate } from '@/types/database'

export function buildStoragePath(userId: string, documentId: string): string {
  return `${userId}/${documentId}.md`
}

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
  if (!user) return

  await supabase.from('documents').update(updates).eq('id', id)

  if (content !== undefined) {
    const path = buildStoragePath(user.id, id)
    await supabase.storage
      .from('documents')
      .upload(path, content, {
        contentType: 'text/markdown',
        upsert: true,
      })
  }

  revalidatePath(`/editor/${id}`)
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const path = buildStoragePath(user.id, id)
  await supabase.storage.from('documents').remove([path])
  await supabase.from('documents').delete().eq('id', id)

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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run actions/__tests__/documents.test.ts
```

Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "add document server actions"
```

---

### Task 7: Auth pages (login + register)

**Files:**
- Create: `components/auth/login-form.tsx`, `components/auth/register-form.tsx`
- Create: `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`

- [ ] **Step 1: Create LoginForm component**

Create `components/auth/login-form.tsx`:
```typescript
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, type AuthResult } from '@/actions/auth'

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(
    login,
    null
  )

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required placeholder="••••••••" />
      </div>
      {state && 'error' in state && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        No account?{' '}
        <Link href="/register" className="underline">Register</Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Create RegisterForm component**

Create `components/auth/register-form.tsx`:
```typescript
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { register, type AuthResult } from '@/actions/auth'

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(
    register,
    null
  )

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required placeholder="Min. 6 characters" />
      </div>
      {state && 'error' in state && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="underline">Sign in</Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 3: Create auth pages**

Create `app/(auth)/login/page.tsx`:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
```

Create `app/(auth)/register/page.tsx`:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RegisterForm } from '@/components/auth/register-form'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Verify pages render**

```bash
npm run dev
```

Visit http://localhost:3000/login and http://localhost:3000/register — both should show centered card forms.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "add login and register pages"
```

---

### Task 8: Dashboard

**Files:**
- Create: `components/dashboard/doc-list.tsx`, `components/dashboard/create-doc-button.tsx`
- Create: `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create CreateDocButton**

Create `components/dashboard/create-doc-button.tsx`:
```typescript
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
```

- [ ] **Step 2: Install date-fns**

```bash
npm install date-fns
```

- [ ] **Step 3: Create DocList component**

Create `components/dashboard/doc-list.tsx`:
```typescript
'use client'

import { useTransition } from 'react'
import Link from 'next/link'
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
              startTransition(() => deleteDocument(doc.id))
            }
          >
            Delete
          </Button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Create app layout**

Create `app/(app)/layout.tsx`:
```typescript
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
```

- [ ] **Step 5: Create dashboard page**

Create `app/(app)/dashboard/page.tsx`:
```typescript
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
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "add dashboard with doc list and create button"
```

---

### Task 9: TipTap WYSIWYG editor component

**Files:**
- Create: `components/editor/tiptap-editor.tsx`, `components/editor/publish-toggle.tsx`
- Create: `app/(app)/editor/[id]/page.tsx`

- [ ] **Step 1: Create TipTap editor component**

Create `components/editor/tiptap-editor.tsx`:
```typescript
'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/extension-markdown'
import { updateDocument } from '@/actions/documents'
import { debounce } from '@/lib/utils'

interface TipTapEditorProps {
  documentId: string
  initialTitle: string
  initialContent: string
}

export function TipTapEditor({
  documentId,
  initialTitle,
  initialContent,
}: TipTapEditorProps) {
  const titleRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-neutral dark:prose-invert max-w-none min-h-[60vh] focus:outline-none p-4',
      },
    },
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const save = useCallback(
    debounce(async (title: string, markdown: string) => {
      await updateDocument(
        documentId,
        { title, updated_at: new Date().toISOString() },
        markdown
      )
    }, 1000),
    [documentId]
  )

  useEffect(() => {
    if (!editor) return
    const handler = () => {
      const markdown = editor.storage.markdown.getMarkdown()
      const title = titleRef.current?.value ?? 'Untitled'
      save(title, markdown)
    }
    editor.on('update', handler)
    return () => { editor.off('update', handler) }
  }, [editor, save])

  return (
    <div className="space-y-4">
      <input
        ref={titleRef}
        defaultValue={initialTitle}
        onChange={() => {
          const markdown = editor?.storage.markdown.getMarkdown() ?? ''
          save(titleRef.current?.value ?? 'Untitled', markdown)
        }}
        placeholder="Document title"
        className="w-full text-3xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground"
      />
      <div className="border rounded-lg overflow-hidden">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create PublishToggle component**

Create `components/editor/publish-toggle.tsx`:
```typescript
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
```

- [ ] **Step 3: Create editor page**

Create `app/(app)/editor/[id]/page.tsx`:
```typescript
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
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
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
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "add tiptap wysiwyg editor with auto-save and publish toggle"
```

---

### Task 10: Public document view

**Files:**
- Create: `app/doc/[slug]/page.tsx`

- [ ] **Step 1: Install react-markdown**

```bash
npm install react-markdown
```

`react-markdown` renders markdown safely (sanitized) — do not use `dangerouslySetInnerHTML` with raw markdown.

- [ ] **Step 2: Create public view page**

Create `app/doc/[slug]/page.tsx`:
```typescript
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/server'

async function getPublicDoc(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()
  return data
}

export default async function PublicDocPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const doc = await getPublicDoc(slug)
  if (!doc) notFound()

  const supabase = await createClient()
  const path = `${doc.user_id}/${doc.id}.md`
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
        <ReactMarkdown className="prose prose-neutral dark:prose-invert max-w-none">
          {markdownContent}
        </ReactMarkdown>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "add public document view"
```

---

### Task 11: Landing page + root layout

**Files:**
- Modify: `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Update root layout**

Replace `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MarkdownEditor',
  description: 'A simple WYSIWYG markdown editor with sharing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Update landing page**

Replace `app/page.tsx`:
```typescript
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
        <Button asChild>
          <Link href="/register">Get started</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "add landing page and root layout"
```

---

### Task 12: Run all tests and verify build

- [ ] **Step 1: Run all tests**

```bash
npm run test:run
```

Expected: All tests PASS

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors. Fix any TypeScript errors before proceeding.

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Test these flows:
1. Visit `/` — landing page renders
2. Click "Get started" → `/register` — form renders
3. Register with test email → redirected to `/dashboard`
4. Click "+ New document" → redirected to `/editor/[id]`
5. Type in editor → auto-saves (check Supabase dashboard → Storage)
6. Click "Publish" → share link appears, copy it
7. Open share link in incognito → public view renders
8. Click "Unpublish" → link 404s
9. Sign out → redirected to `/login`
10. Sign in → redirected to `/dashboard`

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "verified: all tests pass, build succeeds"
```

---

### Task 13: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

Create a new GitHub repo (via https://github.com/new), then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/markdown-editor.git
git push -u origin main
```

- [ ] **Step 2: Deploy on Vercel**

1. Go to https://vercel.com/new
2. Import the GitHub repo
3. In "Environment Variables", add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click "Deploy"

- [ ] **Step 3: Update Supabase allowed URLs**

In Supabase dashboard → Authentication → URL Configuration:
- Add your Vercel URL to "Site URL" (e.g. `https://markdown-editor-xxx.vercel.app`)
- Add to "Redirect URLs": `https://markdown-editor-xxx.vercel.app/**`

- [ ] **Step 4: Verify production**

Visit the Vercel URL and run through the smoke test from Task 12 Step 3.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "deploy: vercel config and supabase url update"
```
