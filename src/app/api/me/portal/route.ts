import { createClient } from '@/lib/supabase-server'
import { getPortalData } from '@/lib/get-portal-data'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })

  const meta = user.app_metadata as Record<string, string>
  const jogador_id = meta?.jogador_id
  if (!jogador_id) return Response.json({ error: 'Sem jogador associado' }, { status: 403 })

  const data = await getPortalData(jogador_id)
  if (!data) return Response.json({ error: 'Jogador não encontrado' }, { status: 404 })

  return Response.json(data)
}
