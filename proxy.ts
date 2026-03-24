import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Capture cookies with options for use on redirect responses
  let capturedCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          capturedCookies = cookiesToSet.map(({ name, value, options }) => ({ name, value, options }))
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard', '/editor']
  const isProtected = protectedPaths.some(p =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (isProtected && !user) {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    capturedCookies.forEach(({ name, value, options }) =>
      redirectResponse.cookies.set(name, value, options as Parameters<typeof redirectResponse.cookies.set>[2])
    )
    return redirectResponse
  }

  if (user && (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')
  )) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
    capturedCookies.forEach(({ name, value, options }) =>
      redirectResponse.cookies.set(name, value, options as Parameters<typeof redirectResponse.cookies.set>[2])
    )
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
