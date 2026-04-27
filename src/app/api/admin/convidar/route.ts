import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

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

  // Gera o link de convite via REST API (o SDK ignora o redirectTo para invite)
  const generateRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'invite',
        email: jogador.email,
        redirect_to: 'https://barcelombra.vercel.app/aceitar-convite',
      }),
    }
  )

  if (!generateRes.ok) {
    const err = await generateRes.json()
    return Response.json({ error: err.msg ?? 'Erro ao gerar convite' }, { status: 500 })
  }

  const invited = await generateRes.json()
  const invitedUserId: string = invited.user.id
  const inviteUrl: string = invited.action_link

  // Define role no app_metadata e cria perfil
  await supabaseAdmin.auth.admin.updateUserById(invitedUserId, {
    app_metadata: { role: 'jogador', jogador_id },
  })

  await supabaseAdmin.from('user_profiles').upsert({
    user_id: invitedUserId,
    role: 'jogador',
    jogador_id,
  }, { onConflict: 'user_id' })
  try {
    await transporter.sendMail({
      from: `Barcelombra <${process.env.GMAIL_USER}>`,
      to: jogador.email,
      subject: 'Convite para o portal Barcelombra',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <img src="https://barcelombra.vercel.app/Barcelombra_transparente.png" alt="Barcelombra" style="width: 80px; margin-bottom: 16px;" />
          <h2 style="color: #1a1a1a; margin: 0 0 8px;">Bem-vindo ao Barcelombra!</h2>
          <p style="color: #555; margin: 0 0 24px;">
            Foste convidado para aceder ao portal do grupo. Clica no botão abaixo para criar a tua senha e entrar.
          </p>
          <a href="${inviteUrl}"
             style="display: inline-block; background: #22c55e; color: white; font-weight: 600;
                    padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            Aceitar convite
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Se não esperavas este email, podes ignorá-lo.<br/>
            O link expira em 24 horas.
          </p>
        </div>
      `,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ error: `Utilizador criado mas falhou o envio do email: ${message}` }, { status: 500 })
  }

  const msg = reenviar ? `Convite reenviado para ${jogador.email}` : `Convite enviado para ${jogador.email}`
  return Response.json({ ok: true, message: msg })
}
