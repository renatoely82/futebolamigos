import { createClient } from '@/lib/supabase-server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('partidas')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('partidas')
    .update({
      ...(body.data !== undefined && { data: body.data }),
      ...(body.local !== undefined && { local: body.local || null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.observacoes !== undefined && { observacoes: body.observacoes || null }),
      ...(body.times_escolhidos !== undefined && { times_escolhidos: body.times_escolhidos }),
      ...(body.numero_jogadores !== undefined && { numero_jogadores: body.numero_jogadores ?? null }),
      ...(body.nome_time_a !== undefined && { nome_time_a: body.nome_time_a || 'Amarelo' }),
      ...(body.nome_time_b !== undefined && { nome_time_b: body.nome_time_b || 'Azul' }),
      ...(body.placar_time_a !== undefined && { placar_time_a: body.placar_time_a ?? null }),
      ...(body.placar_time_b !== undefined && { placar_time_b: body.placar_time_b ?? null }),
      ...(body.temporada_id !== undefined && { temporada_id: body.temporada_id || null }),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase.from('partidas').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
