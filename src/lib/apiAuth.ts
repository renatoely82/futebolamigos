import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

type AdminResult =
  | { user: { id: string }; forbidden: null }
  | { user: null; forbidden: NextResponse }

/**
 * Verifica se o utilizador autenticado tem role=admin no app_metadata.
 * Usar no início de qualquer handler sensível.
 */
export async function requireAdmin(): Promise<AdminResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, forbidden: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
  }

  const role = (user.app_metadata as Record<string, string>)?.role
  if (role !== 'admin') {
    return { user: null, forbidden: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) }
  }

  return { user: { id: user.id }, forbidden: null }
}
