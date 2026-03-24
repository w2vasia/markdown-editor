import { describe, it, expect, vi, afterEach } from 'vitest'
import { debounce, generateSlug, cn } from '../utils'

describe('debounce', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays function execution', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    debounced()
    debounced()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('generateSlug', () => {
  it('returns a non-empty string', () => {
    const slug = generateSlug()
    expect(typeof slug).toBe('string')
    expect(slug.length).toBeGreaterThan(0)
  })

  it('generates unique slugs', () => {
    const slugs = new Set(Array.from({ length: 10 }, generateSlug))
    expect(slugs.size).toBe(10)
  })
})

describe('debounce – cancel', () => {
  afterEach(() => vi.useRealTimers())

  it('cancel prevents pending call', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    debounced.cancel()
    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting tailwind classes (last wins)', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('ignores falsy values', () => {
    expect(cn('foo', false, undefined, 'bar')).toBe('foo bar')
  })
})
