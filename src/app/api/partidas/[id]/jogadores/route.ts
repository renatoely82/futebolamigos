import { createClient } from '@/lib/supabase-server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('partida_jogadores')
    .select(`
      *,
      jogador:jogadores(*)
    `)
    .eq('partida_id', id)
    .order('criado_em')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { jogador_id } = await request.json()

  const { data, error } = await supabase
    .from('partida_jogadores')
    .insert({
      partida_id: id,
      jogador_id,
      confirmado: true,
      adicionado_manualmente: true,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { jogador_id } = await request.json()

  const { error } = await supabase
    .from('partida_jogadores')
    .delete()
    .eq('partida_id', id)
    .eq('jogador_id', jogador_id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
