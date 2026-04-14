import { createClient } from '@/lib/supabase-server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('temporadas')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  if (body.ativa) {
    await supabase.from('temporadas').update({ ativa: false }).eq('ativa', true).neq('id', id)
  }

  const { data, error } = await supabase
    .from('temporadas')
    .update({
      nome: body.nome,
      data_inicio: body.data_inicio,
      data_fim: body.data_fim,
      ativa: body.ativa ?? false,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const updateData: Record<string, unknown> = {}
  if ('valor_mensalidade' in body) updateData.valor_mensalidade = body.valor_mensalidade ?? null
  if ('valor_diarista' in body) updateData.valor_diarista = body.valor_diarista ?? null

  const { data, error } = await supabase
    .from('temporadas')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { count } = await supabase
    .from('partidas')
    .select('*', { count: 'exact', head: true })
    .eq('temporada_id', id)

  if (count && count > 0) {
    return Response.json(
      { error: `Esta temporada tem ${count} partida(s) vinculada(s) e não pode ser excluída.` },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('temporadas').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
