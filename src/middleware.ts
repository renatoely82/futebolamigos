import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas públicas — sem autenticação necessária
const PUBLIC_PATHS = [
  '/login',
  '/reset-password',
  '/enquete',   // /enquete/[id]?token=xxx (votação por link)
  '/jogador',   // /jogador/[id]?token=xxx (portal por token)
  '/inscricao',
  '/offline.html',
  '/api/public',
  '/api/enquetes',  // votação pública por token
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'))
}

// Rotas permitidas para jogadores
const JOGADOR_ALLOWED = ['/portal', '/api/me']

function isAllowedForJogador(pathname: string): boolean {
  return JOGADOR_ALLOWED.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignora assets estáticos e rotas internas do Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webmanifest|js|css|woff2?)$/)
  ) {
    return NextResponse.next()
  }

  // Rotas públicas passam sempre
  if (isPublic(pathname)) return NextResponse.next()

  // Cria cliente Supabase com cookies da request
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Sem sessão → login
  if (!user) {
    // APIs retornam 401 em vez de redirect
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const meta = user.app_metadata as Record<string, string>
  const role = meta?.role

  // Sem role configurado → login (admin ainda não fez setup)
  if (!role) {
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Sem perfil. Contacte o admin.' }, { status: 403 })
    }
    // Permite acesso ao setup para o primeiro admin
    if (pathname === '/setup') return response
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Admin → acesso total
  if (role === 'admin') {
    // Admin a aceder /portal → redireciona para home admin
    if (pathname === '/portal') {
      const url = request.nextUrl.clone()
      url.pathname = '/partidas'
      return NextResponse.redirect(url)
    }
    return response
  }

  // Jogador → apenas rotas permitidas
  if (role === 'jogador') {
    if (isAllowedForJogador(pathname)) return response

    // API não permitida → 403
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Qualquer outra rota → portal
    const url = request.nextUrl.clone()
    url.pathname = '/portal'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
