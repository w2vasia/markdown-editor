import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocList } from '../doc-list'
import { deleteDocument } from '@/actions/documents'
import type { Document } from '@/types/database'

vi.mock('@/actions/documents', () => ({ deleteDocument: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockDeleteDocument = vi.mocked(deleteDocument)

function makeDoc(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc-1',
    user_id: 'user-1',
    title: 'Test Doc',
    slug: null,
    is_public: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('DocList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders empty state when no documents', () => {
    render(<DocList documents={[]} />)
    expect(screen.getByText(/no documents yet/i)).toBeInTheDocument()
  })

  it('renders document title and edit link', () => {
    render(<DocList documents={[makeDoc({ title: 'My Article' })]} />)
    expect(screen.getByText('My Article')).toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/editor/doc-1')
  })

  it('shows Public badge for public documents', () => {
    render(<DocList documents={[makeDoc({ is_public: true })]} />)
    expect(screen.getByText(/public/i)).toBeInTheDocument()
  })

  it('does not show Public badge for private documents', () => {
    render(<DocList documents={[makeDoc({ is_public: false })]} />)
    expect(screen.queryByText(/public/i)).not.toBeInTheDocument()
  })

  it('calls deleteDocument with correct id when Delete clicked', async () => {
    mockDeleteDocument.mockResolvedValue(undefined)
    render(<DocList documents={[makeDoc()]} />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await vi.waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalledWith('doc-1')
    })
  })

  it('renders multiple documents', () => {
    render(
      <DocList
        documents={[makeDoc({ id: '1', title: 'A' }), makeDoc({ id: '2', title: 'B' })]}
      />,
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })
})
