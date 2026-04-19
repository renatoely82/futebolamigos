import { createClient } from '@/lib/supabase-server'
import type { NextRequest } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('temporada_diretoria')
    .select('*, jogador:jogadores(*)')
    .eq('temporada_id', id)
    .order('criado_em', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { jogador_id } = await request.json()
  if (!jogador_id) return Response.json({ error: 'jogador_id obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('temporada_diretoria')
    .insert({ temporada_id: id, jogador_id })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
