import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PublishToggle } from '../publish-toggle'
import { publishDocument } from '@/actions/documents'
import { toast } from 'sonner'

vi.mock('@/actions/documents', () => ({ publishDocument: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockPublishDocument = vi.mocked(publishDocument)
const mockToast = vi.mocked(toast)

describe('PublishToggle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows Publish button when private', () => {
    render(<PublishToggle documentId="doc-1" initialIsPublic={false} initialSlug={null} />)
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows Unpublish button and share URL input when public', () => {
    render(<PublishToggle documentId="doc-1" initialIsPublic={true} initialSlug="my-slug" />)
    expect(screen.getByRole('button', { name: /unpublish/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('/doc/my-slug')).toBeInTheDocument()
  })

  it('calls publishDocument with true when clicking Publish', async () => {
    mockPublishDocument.mockResolvedValue({ slug: 'new-slug' })
    render(<PublishToggle documentId="doc-1" initialIsPublic={false} initialSlug={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(mockPublishDocument).toHaveBeenCalledWith('doc-1', true))
  })

  it('calls publishDocument with false when clicking Unpublish', async () => {
    mockPublishDocument.mockResolvedValue({ slug: 'keep-slug' })
    render(<PublishToggle documentId="doc-1" initialIsPublic={true} initialSlug="keep-slug" />)
    fireEvent.click(screen.getByRole('button', { name: /unpublish/i }))
    await waitFor(() => expect(mockPublishDocument).toHaveBeenCalledWith('doc-1', false))
  })

  it('shows success toast after publishing', async () => {
    mockPublishDocument.mockResolvedValue({ slug: 'new-slug' })
    render(<PublishToggle documentId="doc-1" initialIsPublic={false} initialSlug={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Document published'))
  })

  it('shows error toast when publish fails', async () => {
    mockPublishDocument.mockRejectedValue(new Error('network error'))
    render(<PublishToggle documentId="doc-1" initialIsPublic={false} initialSlug={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Failed to update publish status'))
  })

  it('disables button while pending', async () => {
    mockPublishDocument.mockReturnValue(new Promise(() => {}))
    render(<PublishToggle documentId="doc-1" initialIsPublic={false} initialSlug={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '…' })).toBeDisabled())
  })
})
