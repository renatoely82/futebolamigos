import { createClient } from '@/lib/supabase-server'
import type { NextRequest } from 'next/server'

type Params = { params: Promise<{ id: string; jogador_id: string }> }

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id, jogador_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('temporada_diretoria')
    .delete()
    .eq('temporada_id', id)
    .eq('jogador_id', jogador_id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
