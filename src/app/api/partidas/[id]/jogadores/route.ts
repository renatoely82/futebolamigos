import { createClient } from '@/lib/supabase-server'
import type { Posicao } from '@/lib/supabase'
import { POSICOES } from '@/lib/supabase'

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

async function checkPartidaRealizada(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data } = await supabase.from('partidas').select('status').eq('id', id).single()
  return data?.status === 'realizada'
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  if (await checkPartidaRealizada(supabase, id)) {
    return Response.json({ error: 'Partida já realizada. Convocados não podem ser modificados.' }, { status: 403 })
  }

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  if (await checkPartidaRealizada(supabase, id)) {
    return Response.json({ error: 'Partida já realizada.' }, { status: 403 })
  }

  const { jogador_id, posicao_convocacao } = await request.json()

  if (posicao_convocacao !== null && !POSICOES.includes(posicao_convocacao as Posicao)) {
    return Response.json({ error: 'Posição inválida.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('partida_jogadores')
    .update({ posicao_convocacao: posicao_convocacao ?? null })
    .eq('partida_id', id)
    .eq('jogador_id', jogador_id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  if (await checkPartidaRealizada(supabase, id)) {
    return Response.json({ error: 'Partida já realizada. Convocados não podem ser modificados.' }, { status: 403 })
  }

  const { jogador_id } = await request.json()

  const { error } = await supabase
    .from('partida_jogadores')
    .delete()
    .eq('partida_id', id)
    .eq('jogador_id', jogador_id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
