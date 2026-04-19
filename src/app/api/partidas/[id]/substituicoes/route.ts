import { createClient } from '@/lib/supabase-server'
import type { TeamSplit } from '@/lib/supabase'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('substituicoes')
    .select(`
      *,
      jogador_ausente:jogadores!substituicoes_jogador_ausente_id_fkey(*),
      jogador_substituto:jogadores!substituicoes_jogador_substituto_id_fkey(*)
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
  const { jogador_ausente_id, jogador_substituto_id, motivo } = await request.json()

  if (!jogador_ausente_id || !jogador_substituto_id) {
    return Response.json(
      { error: 'Campos obrigatórios: jogador_ausente_id, jogador_substituto_id' },
      { status: 400 }
    )
  }
  if (jogador_ausente_id === jogador_substituto_id) {
    return Response.json(
      { error: 'Jogador ausente e substituto devem ser diferentes' },
      { status: 400 }
    )
  }

  const { data: partida } = await supabase
    .from('partidas')
    .select('times_escolhidos')
    .eq('id', id)
    .single()

  const tc = partida?.times_escolhidos as TeamSplit | null
  const inTeams = tc?.time_a?.includes(jogador_ausente_id) || tc?.time_b?.includes(jogador_ausente_id)
  if (!inTeams) {
    return Response.json(
      { error: 'Jogador ausente não está nos times selecionados desta partida' },
      { status: 400 }
    )
  }

  const { data: sub, error: subError } = await supabase
    .from('substituicoes')
    .insert({ partida_id: id, jogador_ausente_id, jogador_substituto_id, motivo: motivo || null })
    .select(`
      *,
      jogador_ausente:jogadores!substituicoes_jogador_ausente_id_fkey(*),
      jogador_substituto:jogadores!substituicoes_jogador_substituto_id_fkey(*)
    `)
    .single()

  if (subError) return Response.json({ error: subError.message }, { status: 500 })

  // Garante que o substituto tem registro em partida_jogadores para a classificação
  await supabase
    .from('partida_jogadores')
    .upsert(
      { partida_id: id, jogador_id: jogador_substituto_id, confirmado: true, adicionado_manualmente: true },
      { onConflict: 'partida_id,jogador_id', ignoreDuplicates: true }
    )

  return Response.json(sub, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { substituicao_id } = await request.json()

  if (!substituicao_id) {
    return Response.json({ error: 'substituicao_id obrigatório' }, { status: 400 })
  }

  const { error } = await supabase
    .from('substituicoes')
    .delete()
    .eq('id', substituicao_id)
    .eq('partida_id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
