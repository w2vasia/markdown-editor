import { describe, it, expect } from 'vitest'
import { buildStoragePath } from '../documents'

describe('buildStoragePath', () => {
  it('returns correct storage path', () => {
    const path = buildStoragePath('user-123', 'doc-456')
    expect(path).toBe('user-123/doc-456.md')
  })
})
