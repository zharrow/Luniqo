import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_error', requestUrl.origin)
    )
  }

  try {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('OAuth code exchange error:', exchangeError)
      return NextResponse.redirect(
        new URL('/login?error=auth_callback_error', requestUrl.origin)
      )
    }

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(
        new URL('/login?error=auth_callback_error', requestUrl.origin)
      )
    }

    // Check if the user has a valid profile (existing account)
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('id, role, created_by_id, created_at')
      .eq('id', user.id)
      .eq('is_active', true)
      .single() as { data: { id: string; role: string; created_by_id: string | null; created_at: string } | null }

    // If no profile exists, check if user is a Guardian (parent portal)
    if (!profile) {
      // Check guardian_user table for portal access
      const { data: guardianUser } = await (supabase as any)
        .from('guardian_user')
        .select('id, guardian_id')
        .eq('user_id', user.id)
        .single() as { data: { id: string; guardian_id: string } | null }

      if (guardianUser) {
        // User is a Guardian → redirect to parent portal
        return NextResponse.redirect(new URL('/portal/home', requestUrl.origin))
      }

      // Neither profile nor guardian_user → new self-registration
      // Create Owner profile and redirect to setup
      try {
        const adminClient = createAdminSupabase(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Create Owner profile for self-registered user
        const { error: insertError } = await adminClient.from('profiles').insert({
          id: user.id,
          email: user.email,
          role: 'Owner',
          first_name: user.user_metadata?.full_name?.split(' ')[0] || null,
          last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          is_active: true,
        })

        if (insertError) {
          console.error('Error creating profile for OAuth user:', insertError)
          await supabase.auth.signOut()
          return NextResponse.redirect(
            new URL('/login?error=auth_callback_error', requestUrl.origin)
          )
        }

        // New Owner without enterprise → redirect to setup
        return NextResponse.redirect(new URL('/setup', requestUrl.origin))
      } catch (createError) {
        console.error('Error during self-registration:', createError)
        await supabase.auth.signOut()
        return NextResponse.redirect(
          new URL('/login?error=auth_callback_error', requestUrl.origin)
        )
      }
    }

    // Valid existing user — redirect based on role
    // The login page + AuthContext will handle the role-based redirect
    const redirectMap: Record<string, string> = {
      Owner: '/owner/dashboard',
      Developer: '/developer/dashboard',
      Employee: '/employee/dashboard',
    }

    const redirectPath = redirectMap[profile.role] || '/login'

    return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_error', requestUrl.origin)
    )
  }
}
