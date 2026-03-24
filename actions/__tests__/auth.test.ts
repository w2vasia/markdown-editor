import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateAuthInput } from '../../lib/utils'
import { register, login, logout } from '../auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { buildMockSupabaseClient, buildUnauthClient } from '@/lib/__tests__/supabase-mock'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

const mockCreateClient = vi.mocked(createClient)
const mockRedirect = vi.mocked(redirect)

// ── Existing tests (unchanged) ────────────────────────────────────────────────
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

// ── register ──────────────────────────────────────────────────────────────────
describe('register', () => {
  function makeFormData(email: string, password: string) {
    const fd = new FormData()
    fd.set('email', email)
    fd.set('password', password)
    return fd
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue(buildMockSupabaseClient() as any)
  })

  it('returns error for invalid input without calling supabase', async () => {
    const result = await register(null, makeFormData('bad', '123'))
    expect(result).toEqual({ error: expect.any(String) })
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('returns supabase error when signUp fails', async () => {
    const client = buildMockSupabaseClient()
    client.auth.signUp.mockResolvedValue({ data: { session: null }, error: { message: 'Email taken' } })
    mockCreateClient.mockResolvedValue(client as any)

    const result = await register(null, makeFormData('a@b.com', 'password123'))
    expect(result).toEqual({ error: 'Email taken' })
  })

  it('returns success with message when email confirmation required (no session)', async () => {
    const client = buildMockSupabaseClient()
    client.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
    mockCreateClient.mockResolvedValue(client as any)

    const result = await register(null, makeFormData('a@b.com', 'password123'))
    expect(result).toEqual({ success: true, message: expect.stringContaining('email') })
  })

  it('redirects to dashboard when session exists after signup', async () => {
    const client = buildMockSupabaseClient()
    client.auth.signUp.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null })
    mockCreateClient.mockResolvedValue(client as any)

    await register(null, makeFormData('a@b.com', 'password123'))
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })
})

// ── login ─────────────────────────────────────────────────────────────────────
describe('login', () => {
  function makeFormData(email: string, password: string) {
    const fd = new FormData()
    fd.set('email', email)
    fd.set('password', password)
    return fd
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue(buildMockSupabaseClient() as any)
  })

  it('returns error for invalid input', async () => {
    const result = await login(null, makeFormData('', 'pw'))
    expect(result).toEqual({ error: expect.any(String) })
  })

  it('returns supabase error on bad credentials', async () => {
    const client = buildMockSupabaseClient()
    client.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    mockCreateClient.mockResolvedValue(client as any)

    const result = await login(null, makeFormData('a@b.com', 'wrongpass'))
    expect(result).toEqual({ error: 'Invalid credentials' })
  })

  it('redirects to dashboard on success', async () => {
    await login(null, makeFormData('a@b.com', 'password123'))
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })
})

// ── logout ────────────────────────────────────────────────────────────────────
describe('logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls signOut and redirects to /login', async () => {
    mockCreateClient.mockResolvedValue(buildMockSupabaseClient() as any)
    await logout()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('still redirects when signOut errors', async () => {
    const client = buildMockSupabaseClient()
    client.auth.signOut.mockResolvedValue({ error: { message: 'network fail' } })
    mockCreateClient.mockResolvedValue(client as any)

    await logout()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })
})
