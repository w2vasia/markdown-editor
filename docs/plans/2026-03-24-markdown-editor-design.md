# Markdown Editor — Design

## Overview

Online WYSIWYG markdown editor with user accounts and public document sharing. Deployed on Vercel.

## Stack

- Next.js 14 (App Router, TypeScript)
- Supabase (auth + PostgreSQL + storage)
- TipTap — WYSIWYG markdown editor
- Tailwind CSS + shadcn/ui

## Data Model

```sql
-- managed by Supabase Auth
users

-- managed by app
documents (
  id          uuid primary key,
  user_id     uuid references auth.users,
  title       text,
  slug        text unique,        -- nanoid, generated on publish
  is_public   boolean default false,
  created_at  timestamptz,
  updated_at  timestamptz
)
-- document content stored as .md in Supabase Storage, keyed by document id
```

## File Structure

```
markdown-editor/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   └── editor/[id]/page.tsx
│   ├── doc/[slug]/page.tsx      ← public, no auth required
│   └── layout.tsx
├── components/
│   ├── editor/                  ← TipTap WYSIWYG wrapper
│   ├── ui/                      ← shadcn components
│   └── dashboard/               ← doc list, create button
├── lib/
│   ├── supabase/
│   │   ├── client.ts            ← browser client
│   │   └── server.ts            ← server client (RSC/actions)
│   └── utils.ts
├── actions/
│   ├── auth.ts
│   └── documents.ts
└── middleware.ts                ← protect /dashboard, /editor routes
```

## Key Flows

1. Register → dashboard → create doc → editor → publish → copy share link
2. Anyone with `/doc/[slug]` can read without account

## Auth

Supabase Auth with `@supabase/ssr`. Sessions via cookies. `middleware.ts` protects `/dashboard` and `/editor` routes.

## Document Save

Auto-save on change (debounced 1s) via Next.js Server Action:
- Upsert metadata row in PostgreSQL
- Upload `.md` content to Supabase Storage bucket `documents/{id}.md`

## Sharing

Toggle "Publish" in editor → sets `is_public=true`, generates `slug` (nanoid) → shareable URL `/doc/[slug]`.
