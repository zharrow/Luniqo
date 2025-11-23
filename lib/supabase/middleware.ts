import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if this is a tablet route (employees with PIN use localStorage, not Supabase Auth)
  const isTabletRoute = request.nextUrl.pathname.startsWith('/tablet')
  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth')
  const isSetupRoute = request.nextUrl.pathname === '/setup'

  // Only redirect to login if:
  // - No Supabase Auth user
  // - Not a tablet route (PIN auth)
  // - Not already on a public route
  if (!user && !isTabletRoute && !isPublicRoute) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Check if user is Admin without enterprise and redirect to setup
  if (user && !isTabletRoute && !isPublicRoute && !isSetupRoute) {
    const userEmail = user.email

    if (userEmail) {
      // Check if Admin
      const { data: admin } = await supabase
        .from('admin')
        .select('id')
        .eq('email', userEmail)
        .eq('is_active', true)
        .single()

      if (admin) {
        // Check if enterprise exists for this admin
        const { data: enterprise } = await supabase
          .from('enterprise')
          .select('id')
          .eq('admin_id', admin.id)
          .single()

        // Redirect to setup if no enterprise
        if (!enterprise) {
          const url = request.nextUrl.clone()
          url.pathname = '/setup'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
