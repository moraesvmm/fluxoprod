import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Allow the app to boot even without env configured (shows /setup).
  if (!hasSupabaseEnv) {
    if (!request.nextUrl.pathname.startsWith('/setup')) {
      return NextResponse.redirect(new URL('/setup', request.url))
    }
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Set up SSR auth client for middleware specifically
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public/auth routes
  if ((pathname.startsWith('/tenant') || pathname.startsWith('/admin') || pathname.startsWith('/mestre')) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // se o user já estiver logado e tentar ir pro login, joga pro dashboard
  if (pathname.startsWith('/login') && user) {
     return NextResponse.redirect(new URL('/tenant/dashboard', request.url))
  }

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, empresa_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Sem perfil = sem acesso (evita bypass de RLS por app)
    if (!profile) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const isMaster = profile.role === 'master'

    // master: só governa /admin (e pode usar onboarding /mestre)
    if (isMaster) {
      if (pathname.startsWith('/tenant')) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    } else {
      // tenant user: não pode acessar rotas globais
      if (pathname.startsWith('/admin') || pathname.startsWith('/mestre')) {
        return NextResponse.redirect(new URL('/tenant/dashboard', request.url))
      }

      // Enforce module feature flags
      if (pathname.startsWith('/tenant')) {
        const parts = pathname.split('/').filter(Boolean) // ['tenant', '<modulo>', ...]
        const moduleKey = parts.length >= 2 ? parts[1] : 'dashboard'

        // Rotas especiais que não são módulos
        if (moduleKey !== 'sem-modulos') {
          const { data: modRow } = await supabase
            .from('empresa_modulos')
            .select('ativo')
            .eq('empresa_id', profile.empresa_id)
            .eq('modulo_key', moduleKey)
            .maybeSingle()

          if (!modRow?.ativo) {
            return NextResponse.redirect(new URL('/tenant/sem-modulos', request.url))
          }
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
