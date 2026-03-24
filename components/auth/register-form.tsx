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
      {state && 'success' in state && state.message && (
        <p className="text-sm text-green-600">{state.message}</p>
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
