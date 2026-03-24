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
