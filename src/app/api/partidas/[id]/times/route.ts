import { createClient } from '@/lib/supabase-server'
import { generateTeamProposals } from '@/lib/team-balancer'
import type { Jogador, Posicao } from '@/lib/supabase'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: currentPartida } = await supabase
    .from('partidas')
    .select('data, temporada_id')
    .eq('id', id)
    .single()

  if (!currentPartida) return Response.json(null)

  let query = supabase
    .from('partidas')
    .select('data, nome_time_a, nome_time_b, times_escolhidos')
    .lt('data', currentPartida.data)
    .not('times_escolhidos', 'is', null)
    .order('data', { ascending: false })
    .limit(1)

  if (currentPartida.temporada_id) {
    query = query.eq('temporada_id', currentPartida.temporada_id)
  }

  const { data: lastMatch } = await query.single()
  if (!lastMatch?.times_escolhidos) return Response.json(null)

  const allIds = [
    ...lastMatch.times_escolhidos.time_a,
    ...lastMatch.times_escolhidos.time_b,
  ]

  const { data: jogadores } = await supabase
    .from('jogadores')
    .select('*')
    .in('id', allIds)

  const jogadoresMap = new Map((jogadores ?? []).map((j: Jogador) => [j.id, j]))

  return Response.json({
    data: lastMatch.data,
    nome_time_a: lastMatch.nome_time_a,
    nome_time_b: lastMatch.nome_time_b,
    time_a: lastMatch.times_escolhidos.time_a.map((id: string) => jogadoresMap.get(id)).filter(Boolean),
    time_b: lastMatch.times_escolhidos.time_b.map((id: string) => jogadoresMap.get(id)).filter(Boolean),
  })
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: partida } = await supabase.from('partidas').select('status').eq('id', id).single()
  if (partida?.status === 'realizada') {
    return Response.json({ error: 'Partida já realizada. Times definidos não podem ser modificados.' }, { status: 403 })
  }

  // Get confirmed players for this match with full jogador details
  const { data: partidaJogadores, error: pjError } = await supabase
    .from('partida_jogadores')
    .select('posicao_convocacao, jogador:jogadores(*)')
    .eq('partida_id', id)
    .eq('confirmado', true)

  if (pjError) return Response.json({ error: pjError.message }, { status: 500 })

  const players: Jogador[] = (partidaJogadores ?? [])
    .map(pj => {
      const j = pj.jogador as unknown as Jogador
      const override = (pj as unknown as { posicao_convocacao: Posicao | null }).posicao_convocacao
      return override ? { ...j, posicao_principal: override } : j
    })
    .filter(Boolean)

  if (players.length < 2) {
    return Response.json({ error: 'Precisa de pelo menos 2 jogadores.' }, { status: 400 })
  }

  // Use current match's chosen teams as reference if they exist,
  // otherwise fall back to the last previous match with chosen teams
  const { data: currentPartida } = await supabase
    .from('partidas')
    .select('data, times_escolhidos')
    .eq('id', id)
    .single()

  let previousTeams = null
  if (currentPartida?.times_escolhidos) {
    previousTeams = currentPartida.times_escolhidos
  } else if (currentPartida) {
    const { data: lastMatch } = await supabase
      .from('partidas')
      .select('times_escolhidos')
      .lt('data', currentPartida.data)
      .not('times_escolhidos', 'is', null)
      .order('data', { ascending: false })
      .limit(1)
      .single()

    if (lastMatch?.times_escolhidos) {
      previousTeams = lastMatch.times_escolhidos
    }
  }

  // Generate 3 proposals
  const proposals = generateTeamProposals(players, previousTeams)

  // Delete existing proposals for this match
  await supabase.from('propostas_times').delete().eq('partida_id', id)

  // Store proposals
  const toInsert = proposals.map(p => ({
    partida_id: id,
    proposta_numero: p.proposta_numero,
    time_a: p.time_a.map(j => j.id),
    time_b: p.time_b.map(j => j.id),
    selecionada: false,
  }))

  const { error: insertError } = await supabase.from('propostas_times').insert(toInsert)
  if (insertError) return Response.json({ error: insertError.message }, { status: 500 })

  return Response.json(proposals)
}
