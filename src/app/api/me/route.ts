import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type MeData = {
  user_id: string
  email: string
  role: 'admin' | 'jogador'
  jogador_id: string | null
  jogador_nome: string | null
}

// GET /api/me — perfil do utilizador autenticado
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })

  const meta = user.app_metadata as Record<string, string>
  const role = meta?.role as 'admin' | 'jogador' | undefined

  if (!role) return Response.json({ error: 'Sem perfil configurado' }, { status: 403 })

  let jogador_nome: string | null = null
  const jogador_id = meta?.jogador_id ?? null

  if (jogador_id) {
    const { data: j } = await supabaseAdmin
      .from('jogadores')
      .select('nome')
      .eq('id', jogador_id)
      .single()
    jogador_nome = j?.nome ?? null
  }

  return Response.json({
    user_id: user.id,
    email: user.email ?? '',
    role,
    jogador_id,
    jogador_nome,
  } satisfies MeData)
}
