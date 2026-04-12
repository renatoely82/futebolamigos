import { createClient } from '@/lib/supabase-server'
import { generateTeamProposals } from '@/lib/team-balancer'
import type { Jogador } from '@/lib/supabase'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Get confirmed players for this match with full jogador details
  const { data: partidaJogadores, error: pjError } = await supabase
    .from('partida_jogadores')
    .select('jogador:jogadores(*)')
    .eq('partida_id', id)
    .eq('confirmado', true)

  if (pjError) return Response.json({ error: pjError.message }, { status: 500 })

  const players: Jogador[] = (partidaJogadores ?? [])
    .map(pj => pj.jogador as unknown as Jogador)
    .filter(Boolean)

  if (players.length < 2) {
    return Response.json({ error: 'Precisa de pelo menos 2 jogadores.' }, { status: 400 })
  }

  // Get the last match (before this one) with chosen teams
  const { data: currentPartida } = await supabase
    .from('partidas')
    .select('data')
    .eq('id', id)
    .single()

  let previousTeams = null
  if (currentPartida) {
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
