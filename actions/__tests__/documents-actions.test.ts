import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDocument, updateDocument } from '../documents'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { buildMockSupabaseClient, buildUnauthClient } from '@/lib/__tests__/supabase-mock'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn().mockImplementation(() => { throw new Error('NEXT_REDIRECT') }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockCreateClient = vi.mocked(createClient)
const mockRedirect = vi.mocked(redirect)
const mockRevalidatePath = vi.mocked(revalidatePath)

beforeEach(() => {
  vi.clearAllMocks()
})

// ── createDocument ────────────────────────────────────────────────────────────
describe('createDocument', () => {
  it('redirects to /login when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(buildUnauthClient() as any)
    await createDocument().catch(() => {})
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('throws when insert fails', async () => {
    const client = buildMockSupabaseClient()
    client.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    } as any)
    mockCreateClient.mockResolvedValue(client as any)

    await expect(createDocument()).rejects.toThrow('DB error')
  })

  it('redirects to /editor/<id> after successful insert', async () => {
    const client = buildMockSupabaseClient()
    client.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-doc-id' }, error: null }),
    } as any)
    mockCreateClient.mockResolvedValue(client as any)

    await createDocument().catch(() => {})
    expect(mockRedirect).toHaveBeenCalledWith('/editor/new-doc-id')
  })
})

// ── updateDocument ────────────────────────────────────────────────────────────
describe('updateDocument', () => {
  function makeUpdateChain(errorOrNull: null | { message: string }) {
    let eqCount = 0
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn(),
    } as any
    chain.eq = vi.fn().mockImplementation(() => {
      eqCount++
      if (eqCount === 2) return Promise.resolve({ error: errorOrNull })
      return chain
    })
    return chain
  }

  it('redirects to /login when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(buildUnauthClient() as any)
    await updateDocument('doc-1', { title: 'x' }).catch(() => {})
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('throws when db update fails', async () => {
    const client = buildMockSupabaseClient()
    client.from.mockReturnValue(makeUpdateChain({ message: 'update fail' }))
    mockCreateClient.mockResolvedValue(client as any)

    await expect(updateDocument('doc-1', { title: 'x' })).rejects.toThrow('update fail')
  })

  it('does not upload to storage when content is undefined', async () => {
    const client = buildMockSupabaseClient()
    client.from.mockReturnValue(makeUpdateChain(null))
    mockCreateClient.mockResolvedValue(client as any)

    await updateDocument('doc-1', { title: 'new title' })

    expect(client.storage.from).not.toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/editor/doc-1')
  })

  it('uploads to storage when content is provided', async () => {
    const client = buildMockSupabaseClient()
    client.from.mockReturnValue(makeUpdateChain(null))
    mockCreateClient.mockResolvedValue(client as any)

    await updateDocument('doc-1', { title: 'x' }, '# Hello')

    const storageBucket = client.storage.from.mock.results[0].value
    expect(storageBucket.upload).toHaveBeenCalledWith(
      'user-123/doc-1.md',
      '# Hello',
      expect.objectContaining({ upsert: true })
    )
  })
})
