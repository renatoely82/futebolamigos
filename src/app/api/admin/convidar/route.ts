import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/convidar
// Body: { jogador_id: string }
// Envia convite por email ao jogador. O email é lido do registo do jogador.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  // Verifica que o utilizador é admin
  const role = (user.app_metadata as Record<string, string>)?.role
  if (role !== 'admin') return Response.json({ error: 'Sem permissão' }, { status: 403 })

  const { jogador_id, reenviar } = await req.json()
  if (!jogador_id) return Response.json({ error: 'jogador_id obrigatório' }, { status: 400 })

  // Lê o jogador
  const { data: jogador } = await supabaseAdmin
    .from('jogadores')
    .select('id, nome, email')
    .eq('id', jogador_id)
    .single()

  if (!jogador) return Response.json({ error: 'Jogador não encontrado' }, { status: 404 })
  if (!jogador.email) return Response.json({ error: 'Jogador não tem email cadastrado' }, { status: 400 })

  // Verifica se já tem convite/acesso
  if (!reenviar) {
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role')
      .eq('jogador_id', jogador_id)
      .single()

    if (existingProfile) {
      return Response.json({ error: `${jogador.nome} já tem acesso (${existingProfile.role}).` }, { status: 409 })
    }
  }

  // Envia convite via Supabase (magic link de definição de senha)
  const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    jogador.email,
    { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/portal` }
  )

  if (inviteErr) {
    // Utilizador pode já existir — tenta buscar pelo email
    if (inviteErr.message?.includes('already been registered')) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = users?.users?.find(u => u.email === jogador.email)
      if (existingUser) {
        // Define role e cria perfil para utilizador existente
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          app_metadata: { role: 'jogador', jogador_id },
        })
        await supabaseAdmin.from('user_profiles').upsert({
          user_id: existingUser.id,
          role: 'jogador',
          jogador_id,
        }, { onConflict: 'user_id' })
        return Response.json({ ok: true, message: 'Acesso atribuído ao utilizador existente.' })
      }
    }
    return Response.json({ error: inviteErr.message }, { status: 500 })
  }

  // Define app_metadata com role e jogador_id
  await supabaseAdmin.auth.admin.updateUserById(invited.user.id, {
    app_metadata: { role: 'jogador', jogador_id },
  })

  // Cria o perfil
  await supabaseAdmin.from('user_profiles').insert({
    user_id: invited.user.id,
    role: 'jogador',
    jogador_id,
  })

  return Response.json({ ok: true, message: `Convite enviado para ${jogador.email}` })
}
