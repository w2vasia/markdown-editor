import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateDocButton } from '../create-doc-button'
import { createDocument } from '@/actions/documents'

vi.mock('@/actions/documents', () => ({ createDocument: vi.fn() }))

const mockCreateDocument = vi.mocked(createDocument)

describe('CreateDocButton', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders button with correct label', () => {
    render(<CreateDocButton />)
    expect(screen.getByRole('button', { name: /new document/i })).toBeInTheDocument()
  })

  it('calls createDocument when clicked', async () => {
    mockCreateDocument.mockResolvedValue(undefined)
    render(<CreateDocButton />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(mockCreateDocument).toHaveBeenCalledTimes(1))
  })

  it('disables button while creating', async () => {
    mockCreateDocument.mockReturnValue(new Promise(() => {}))
    render(<CreateDocButton />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled())
  })
})
