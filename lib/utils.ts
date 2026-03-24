import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { nanoid } from 'nanoid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debounce<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  delay: number
): ((...args: Args) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout>
  const debounced = (...args: Args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
  debounced.cancel = () => clearTimeout(timer)
  return debounced
}

export function generateSlug(): string {
  return nanoid(10)
}

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

export function buildStoragePath(userId: string, documentId: string): string {
  return `${userId}/${documentId}.md`
}

