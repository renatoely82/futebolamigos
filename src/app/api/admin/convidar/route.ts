import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/convidar
// Body: { jogador_id: string, reenviar?: boolean }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (user.app_metadata as Record<string, string>)?.role
  if (role !== 'admin') return Response.json({ error: 'Sem permissão' }, { status: 403 })

  const { jogador_id, reenviar } = await req.json()
  if (!jogador_id) return Response.json({ error: 'jogador_id obrigatório' }, { status: 400 })

  const { data: jogador } = await supabaseAdmin
    .from('jogadores')
    .select('id, nome, email')
    .eq('id', jogador_id)
    .single()

  if (!jogador) return Response.json({ error: 'Jogador não encontrado' }, { status: 404 })
  if (!jogador.email) return Response.json({ error: 'Jogador não tem email cadastrado' }, { status: 400 })

  // Verifica se já tem acesso (só bloqueia se não for reenvio)
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

  // Para reenvio: se utilizador já existe no auth, apaga (se não confirmado) para poder re-convidar
  if (reenviar) {
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    const existingAuthUser = usersData?.users?.find(u => u.email === jogador.email)

    if (existingAuthUser) {
      // Se já confirmou, não precisa reenviar — já tem acesso
      if (existingAuthUser.email_confirmed_at) {
        return Response.json({ ok: true, message: `${jogador.nome} já confirmou o acesso e pode entrar normalmente.` })
      }
      // Não confirmou ainda — apaga para poder re-convidar (ON DELETE CASCADE remove o user_profile)
      await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id)
    }
  }

  // Envia convite
  const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    jogador.email,
    { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/aceitar-convite` }
  )

  if (inviteErr) return Response.json({ error: inviteErr.message }, { status: 500 })

  // Define role no app_metadata e cria perfil
  await supabaseAdmin.auth.admin.updateUserById(invited.user.id, {
    app_metadata: { role: 'jogador', jogador_id },
  })

  await supabaseAdmin.from('user_profiles').upsert({
    user_id: invited.user.id,
    role: 'jogador',
    jogador_id,
  }, { onConflict: 'user_id' })

  const msg = reenviar ? `Convite reenviado para ${jogador.email}` : `Convite enviado para ${jogador.email}`
  return Response.json({ ok: true, message: msg })
}
