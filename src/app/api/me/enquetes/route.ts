import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type MeEnquete = {
  enquete_id: string
  titulo: string
  descricao: string | null
  ativa: boolean
  token: string
  usado: boolean
}

// GET /api/me/enquetes — enquetes activas onde o jogador tem token
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })

  const meta = user.app_metadata as Record<string, string>
  const jogador_id = meta?.jogador_id
  if (!jogador_id) return Response.json({ error: 'Sem jogador associado' }, { status: 403 })

  // Tokens do jogador com dados da enquete
  const { data: tokens } = await supabaseAdmin
    .from('enquete_tokens')
    .select('token, usado, enquete_id, enquetes(id, titulo, descricao, ativa)')
    .eq('jogador_id', jogador_id)
    .order('enquete_id', { ascending: false })

  if (!tokens) return Response.json([])

  const result: MeEnquete[] = tokens
    .filter(t => {
      const e = Array.isArray(t.enquetes) ? t.enquetes[0] : t.enquetes
      return e?.ativa
    })
    .map(t => {
      const e = Array.isArray(t.enquetes) ? t.enquetes[0] : t.enquetes as { id: string; titulo: string; descricao: string | null; ativa: boolean }
      return {
        enquete_id: e.id,
        titulo: e.titulo,
        descricao: e.descricao,
        ativa: e.ativa,
        token: t.token,
        usado: t.usado,
      }
    })

  return Response.json(result)
}
