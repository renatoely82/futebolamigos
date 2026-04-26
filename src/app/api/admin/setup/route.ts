import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/setup
// Ativa o utilizador autenticado atual como admin.
// Só funciona se ainda não existir nenhum perfil de admin no sistema.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })

  // Garante que ainda não há admins configurados
  const { data: existing } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (existing) {
    return Response.json({ error: 'Sistema já configurado. Contacte o admin.' }, { status: 409 })
  }

  // Define role=admin no app_metadata (incluído no JWT)
  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    app_metadata: { role: 'admin' },
  })

  // Cria o perfil na tabela
  const { error } = await supabaseAdmin.from('user_profiles').insert({
    user_id: user.id,
    role: 'admin',
    jogador_id: null,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true, message: 'Admin configurado com sucesso.' })
}
