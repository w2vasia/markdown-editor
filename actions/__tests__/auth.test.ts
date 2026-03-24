import { describe, it, expect } from 'vitest'
import { validateAuthInput } from '../../lib/utils'

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
