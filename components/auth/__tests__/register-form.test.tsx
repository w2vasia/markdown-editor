/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RegisterForm } from '../register-form'

vi.mock('next/link', () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }))

describe('RegisterForm', () => {
  it('renders email and password fields', () => {
    render(<RegisterForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders submit button with correct label', () => {
    render(<RegisterForm />)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders link to login page', () => {
    render(<RegisterForm />)
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })
})
