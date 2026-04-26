import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type AcessoEntry = {
  user_id: string
  email: string
  role: 'admin' | 'jogador'
  jogador_id: string | null
  jogador_nome: string | null
  criado_em: string
}

// GET /api/admin/acessos — lista todos os utilizadores com acesso
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (user.app_metadata as Record<string, string>)?.role
  if (role !== 'admin') return Response.json({ error: 'Sem permissão' }, { status: 403 })

  const { data: profiles } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, role, jogador_id, criado_em, jogadores(nome)')
    .order('criado_em', { ascending: false })

  if (!profiles) return Response.json([])

  // Get emails from auth.admin.listUsers
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(usersData?.users?.map(u => [u.id, u.email ?? '']) ?? [])

  const result: AcessoEntry[] = profiles.map(p => {
    const jogador = Array.isArray(p.jogadores) ? p.jogadores[0] : p.jogadores as { nome: string } | null
    return {
      user_id: p.user_id,
      email: emailMap.get(p.user_id) ?? '',
      role: p.role as 'admin' | 'jogador',
      jogador_id: p.jogador_id,
      jogador_nome: jogador?.nome ?? null,
      criado_em: p.criado_em,
    }
  })

  return Response.json(result)
}

// DELETE /api/admin/acessos?user_id=xxx — revoga acesso
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (user.app_metadata as Record<string, string>)?.role
  if (role !== 'admin') return Response.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get('user_id')
  if (!user_id) return Response.json({ error: 'user_id obrigatório' }, { status: 400 })

  // Não pode revogar o próprio acesso
  if (user_id === user.id) return Response.json({ error: 'Não podes revogar o teu próprio acesso.' }, { status: 400 })

  // Remove utilizador do Auth (CASCADE apaga user_profiles automaticamente)
  await supabaseAdmin.auth.admin.deleteUser(user_id)

  return Response.json({ ok: true })
}
