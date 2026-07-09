import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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

  const { pathname } = request.nextUrl

  // Protected routes — redirect to login if not authenticated
  const protectedPrefixes = ['/admin', '/supervisor', '/vendor']
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))

  // Refresh session if expired
  let user = null
  let fetchFailed = false
  
  if (isProtected || pathname === '/') {
    try {
      const { data: { user: fetchedUser } } = await supabase.auth.getUser()
      user = fetchedUser
    } catch (err: any) {
      console.error('Proxy: Supabase auth getUser failed:', err?.message || err)
      fetchFailed = true
    }
  }

  if (isProtected) {
    // If fetch failed, check if there is an active session cookie to avoid false-positive redirects
    const cookies = request.cookies.getAll()
    const hasAuthCookie = cookies.some((c) => c.name.includes('-auth-token'))

    if (fetchFailed && hasAuthCookie) {
      console.log('Proxy: Fetch failed but auth cookie is present. Allowing client-side auth fallback.')
    } else if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/'
      return NextResponse.redirect(loginUrl)
    }
  }

  // If already logged in and visiting login page, redirect to their dashboard
  if (pathname === '/' && user) {
    // Role-based redirect is handled client-side after login
    // Here we just let through to avoid infinite loop
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
