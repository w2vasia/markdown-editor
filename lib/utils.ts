import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
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
