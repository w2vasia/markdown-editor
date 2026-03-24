/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDocument, updateDocument, deleteDocument, publishDocument, getDocumentContent } from '../documents'
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

// ── deleteDocument ────────────────────────────────────────────────────────────
describe('deleteDocument', () => {
  function makeDeleteChain(error: null | { message: string }) {
    let eqCount = 0
    const chain = { delete: vi.fn().mockReturnThis(), eq: vi.fn() } as any
    chain.eq = vi.fn().mockImplementation(() => {
      eqCount++
      if (eqCount === 2) return Promise.resolve({ error })
      return chain
    })
    return chain
  }

  it('redirects to /login when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(buildUnauthClient() as any)
    await deleteDocument('doc-1').catch(() => {})
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('calls storage remove (best-effort)', async () => {
    const client = buildMockSupabaseClient()
    client.from.mockReturnValue(makeDeleteChain(null))
    mockCreateClient.mockResolvedValue(client as any)

    await deleteDocument('doc-1')

    const storageBucket = client.storage.from.mock.results[0].value
    expect(storageBucket.remove).toHaveBeenCalledWith(['user-123/doc-1.md'])
  })

  it('throws when db delete fails', async () => {
    const client = buildMockSupabaseClient()
    client.from.mockReturnValue(makeDeleteChain({ message: 'delete fail' }))
    mockCreateClient.mockResolvedValue(client as any)

    await expect(deleteDocument('doc-1')).rejects.toThrow('delete fail')
  })

  it('revalidates /dashboard on success', async () => {
    const client = buildMockSupabaseClient()
    client.from.mockReturnValue(makeDeleteChain(null))
    mockCreateClient.mockResolvedValue(client as any)

    await deleteDocument('doc-1')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
  })
})

// ── publishDocument ───────────────────────────────────────────────────────────
describe('publishDocument', () => {
  function makeFetchChain(slug: string | null, fetchError: null | { message: string } = null) {
    let eqCount = 0
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: { slug }, error: fetchError }),
    } as any
    chain.eq = vi.fn().mockImplementation(() => {
      eqCount++
      if (eqCount === 2) return chain
      return chain
    })
    return chain
  }

  function makeUpdateChain(slug: string | null, updateError: null | { message: string } = null) {
    let eqCount = 0
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { slug }, error: updateError }),
    } as any
    chain.eq = vi.fn().mockImplementation(() => {
      eqCount++
      if (eqCount === 2) return chain
      return chain
    })
    return chain
  }

  it('redirects to /login when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(buildUnauthClient() as any)
    await publishDocument('doc-1', true).catch(() => {})
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('publishing with existing slug reuses it', async () => {
    const client = buildMockSupabaseClient()
    const fetchChain = makeFetchChain('existing-slug')
    const updateChain = makeUpdateChain('existing-slug')
    client.from
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)
    mockCreateClient.mockResolvedValue(client as any)

    const result = await publishDocument('doc-1', true)

    expect(updateChain.update).toHaveBeenCalledWith({ is_public: true, slug: 'existing-slug' })
    expect(result).toEqual({ slug: 'existing-slug' })
  })

  it('publishing with null slug generates new slug', async () => {
    const client = buildMockSupabaseClient()
    const fetchChain = makeFetchChain(null)
    const updateChain = makeUpdateChain('generated-slug')
    client.from
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)
    mockCreateClient.mockResolvedValue(client as any)

    await publishDocument('doc-1', true)

    expect(updateChain.update).toHaveBeenCalledWith({ is_public: true, slug: expect.stringMatching(/\S+/) })
  })

  it('unpublishing only flips is_public, no slug in payload', async () => {
    const client = buildMockSupabaseClient()
    const fetchChain = makeFetchChain('existing-slug')
    const updateChain = makeUpdateChain('existing-slug')
    client.from
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)
    mockCreateClient.mockResolvedValue(client as any)

    await publishDocument('doc-1', false)

    expect(updateChain.update).toHaveBeenCalledWith({ is_public: false })
  })

  it('returns slug from update result', async () => {
    const client = buildMockSupabaseClient()
    const fetchChain = makeFetchChain('my-slug')
    const updateChain = makeUpdateChain('my-slug')
    client.from
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)
    mockCreateClient.mockResolvedValue(client as any)

    const result = await publishDocument('doc-1', true)

    expect(result).toEqual({ slug: 'my-slug' })
  })
})

// ── getDocumentContent ────────────────────────────────────────────────────────
describe('getDocumentContent', () => {
  it('returns empty string on storage download error', async () => {
    const client = buildMockSupabaseClient({ storageDownloadError: { message: 'not found' }, storageDownloadData: null })
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getDocumentContent('user-123', 'doc-1')

    expect(result).toBe('')
  })

  it('returns text content on success', async () => {
    const client = buildMockSupabaseClient({
      storageDownloadData: { text: vi.fn().mockResolvedValue('# My Doc') },
    })
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getDocumentContent('user-123', 'doc-1')

    expect(result).toBe('# My Doc')
    const storageBucket = client.storage.from.mock.results[0].value
    expect(storageBucket.download).toHaveBeenCalledWith('user-123/doc-1.md')
  })
})
