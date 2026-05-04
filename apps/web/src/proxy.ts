import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
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

  // Landing page (/) is always public — never redirect
  if (pathname === '/') {
    return supabaseResponse
  }

  // Public/auth routes
  if ((pathname.startsWith('/tenant') || pathname.startsWith('/admin') || pathname.startsWith('/mestre')) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // se o user já estiver logado e tentar ir pro login, joga pro dashboard
  // MAS apenas se ele tiver um perfil válido, para evitar loop infinito se o perfil estiver faltando
  if (pathname.startsWith('/login') && user) {
    const { data: profileCheck } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileCheck) {
      const dest = profileCheck.role === 'master' ? '/admin' : '/tenant/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    // Se não tem perfil, deixa ele no /login para que o erro seja tratado ou ele possa deslogar
    return supabaseResponse
  }

  if (user) {
    // 1. Buscar o perfil básico primeiro (sem join para evitar Erro 400 por falta de FK)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, empresa_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Se logado mas sem perfil, e não está no login/erro, manda pro login
    if (!profile && !pathname.startsWith('/login') && !pathname.startsWith('/erro')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (profile) {
      // 2. Se tiver empresa, buscar o status da assinatura em uma consulta separada
      let subscriptionStatus = 'ACTIVE'
      if (profile.empresa_id) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('subscription_status')
          .eq('id', profile.empresa_id)
          .maybeSingle()
        
        subscriptionStatus = (empresa as any)?.subscription_status || 'ACTIVE'
      }
      
      // Bloquear acesso se a assinatura estiver inativa
      if (subscriptionStatus === 'INACTIVE' && pathname.startsWith('/tenant')) {
        if (pathname !== '/tenant/configuracoes') {
          return NextResponse.redirect(new URL('/tenant/configuracoes', request.url))
        }
      }

      const isMaster = profile.role === 'master'

      // Schema Routing
      const { data: schema, error: schemaError } = await supabase.rpc('set_tenant_schema', {
        p_user_id: user.id
      })

      if (schemaError) {
        console.error('[Middleware] Erro set_tenant_schema:', schemaError)
        return NextResponse.redirect(new URL('/erro-schema', request.url))
      }

      supabaseResponse.headers.set('x-tenant-schema', schema || 'public')

      if (isMaster) {
        if (pathname.startsWith('/tenant')) {
          return NextResponse.redirect(new URL('/admin', request.url))
        }
      } else {
        if (pathname.startsWith('/admin') || pathname.startsWith('/mestre')) {
          return NextResponse.redirect(new URL('/tenant/dashboard', request.url))
        }

        if (pathname.startsWith('/tenant')) {
          const parts = pathname.split('/').filter(Boolean)
          const moduleKey = parts.length >= 2 ? parts[1] : 'dashboard'

          if (moduleKey !== 'sem-modulos' && moduleKey !== 'dashboard' && moduleKey !== 'configuracoes' && moduleKey !== 'loja' && moduleKey !== 'relatorios') {
            const { data: modRow } = await supabase
              .from('v_empresa_modulos')
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
