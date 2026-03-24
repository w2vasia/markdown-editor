'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateAuthInput } from '@/lib/utils'

export type AuthResult = { error: string } | { success: true; message?: string }

export async function register(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const validation = validateAuthInput(email, password)
  if (!validation.valid) return { error: validation.error! }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }

  // If no session, email confirmation is required
  if (!data.session) {
    return { success: true, message: 'Check your email to confirm your account.' }
  }

  redirect('/dashboard')
}

export async function login(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const validation = validateAuthInput(email, password)
  if (!validation.valid) return { error: validation.error! }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) console.error('signOut error:', error.message)
  redirect('/login')
}
