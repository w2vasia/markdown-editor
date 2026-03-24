import { describe, it, expect, vi, afterEach } from 'vitest'
import { debounce, generateSlug } from '../utils'

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
