import { createClient } from '@/lib/supabase-server'

// GET /api/me/portal
// Retorna os dados do portal para o jogador autenticado,
// delegando para a API pública existente com o token do jogador.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })

  const meta = user.app_metadata as Record<string, string>
  const jogador_id = meta?.jogador_id
  if (!jogador_id) return Response.json({ error: 'Sem jogador associado' }, { status: 403 })

  // Lê o portal_token do jogador para reutilizar a API pública
  const { data: jogador } = await supabase
    .from('jogadores')
    .select('portal_token')
    .eq('id', jogador_id)
    .single()

  if (!jogador) return Response.json({ error: 'Jogador não encontrado' }, { status: 404 })

  // Delega para a API pública (mesma lógica, evita duplicação)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(
    `${baseUrl}/api/public/portal/${jogador_id}?token=${jogador.portal_token}`,
    { cache: 'no-store' }
  )

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
