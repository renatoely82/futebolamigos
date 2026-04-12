import { createClient } from '@/lib/supabase-server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('temporada_mensalistas')
    .select('*, jogador:jogadores(*)')
    .eq('temporada_id', id)
    .order('criado_em', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { jogador_id, meses } = await request.json()

  if (!jogador_id) return Response.json({ error: 'jogador_id obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('temporada_mensalistas')
    .insert({ temporada_id: id, jogador_id, meses: meses ?? null })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { jogador_id, meses } = await request.json()

  if (!jogador_id) return Response.json({ error: 'jogador_id obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('temporada_mensalistas')
    .update({ meses: meses ?? null })
    .eq('temporada_id', id)
    .eq('jogador_id', jogador_id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { jogador_id } = await request.json()

  if (!jogador_id) return Response.json({ error: 'jogador_id obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('temporada_mensalistas')
    .delete()
    .eq('temporada_id', id)
    .eq('jogador_id', jogador_id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
