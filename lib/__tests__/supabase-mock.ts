// lib/__tests__/supabase-mock.ts
import { vi } from 'vitest'

/** Returns a vitest mock of a chained Supabase query builder. */
function makeMockBuilder(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const terminal = vi.fn().mockResolvedValue(resolvedValue)
  for (const method of ['insert', 'update', 'select', 'delete', 'eq', 'order']) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  chain['single'] = terminal
  return chain
}

interface BuildOptions {
  user?: { id: string } | null
  userError?: unknown
  fromBuilder?: ReturnType<typeof makeMockBuilder>
  storageUploadError?: unknown
  storageRemoveData?: unknown
  storageDownloadData?: { text: () => Promise<string> } | null
  storageDownloadError?: unknown
}

/**
 * Builds a minimal Supabase client mock for use in server-action tests.
 *
 * Usage:
 *   mockCreateClient.mockResolvedValue(buildMockSupabaseClient() as any)
 */
export function buildMockSupabaseClient(opts: BuildOptions = {}) {
  const {
    user = { id: 'user-123' },
    userError = null,
    fromBuilder = makeMockBuilder({ data: { id: 'doc-123', slug: null }, error: null }),
    storageUploadError = null,
    storageRemoveData = null,
    storageDownloadData = { text: vi.fn().mockResolvedValue('# Hello') },
    storageDownloadError = null,
  } = opts

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: userError }),
      signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue(fromBuilder),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: storageUploadError }),
        remove: vi.fn().mockResolvedValue({ data: storageRemoveData, error: null }),
        download: vi.fn().mockResolvedValue({
          data: storageDownloadData,
          error: storageDownloadError,
        }),
      }),
    },
  }
}

/** Shorthand: build a client where the user is unauthenticated (null). */
export function buildUnauthClient() {
  return buildMockSupabaseClient({ user: null })
}
