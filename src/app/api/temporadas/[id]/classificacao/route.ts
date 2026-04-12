import { createClient } from '@/lib/supabase-server'
import type { ClassificacaoEntry, Posicao, TeamSplit } from '@/lib/supabase'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: temporadaId } = await params
  const supabase = await createClient()

  const { data: partidas } = await supabase
    .from('partidas')
    .select('id, placar_time_a, placar_time_b, times_escolhidos')
    .eq('temporada_id', temporadaId)
    .eq('status', 'realizada')
    .not('placar_time_a', 'is', null)
    .not('placar_time_b', 'is', null)

  if (!partidas || partidas.length === 0) return Response.json([])

  const partidaIds = partidas.map(p => p.id)

  const [pjsRes, golsRes, jogadoresRes] = await Promise.all([
    supabase
      .from('partida_jogadores')
      .select('partida_id, jogador_id')
      .in('partida_id', partidaIds),
    supabase
      .from('gols')
      .select('partida_id, jogador_id, quantidade, gol_contra')
      .in('partida_id', partidaIds),
    supabase
      .from('jogadores')
      .select('id, nome, posicao_principal')
      .eq('ativo', true),
  ])

  const pjs = pjsRes.data ?? []
  const gols = golsRes.data ?? []
  const jogadores = jogadoresRes.data ?? []

  const jogadorMap = new Map(jogadores.map(j => [j.id, j]))
  const partidaMap = new Map(partidas.map(p => [p.id, p]))

  const golsMap = new Map<string, number>()
  for (const g of gols) {
    if (g.gol_contra) continue  // gols contra não contam na artilharia
    const key = `${g.jogador_id}:${g.partida_id}`
    golsMap.set(key, (golsMap.get(key) ?? 0) + g.quantidade)
  }

  const stats = new Map<string, ClassificacaoEntry>()

  for (const pj of pjs) {
    const jogador = jogadorMap.get(pj.jogador_id)
    if (!jogador) continue
    const partida = partidaMap.get(pj.partida_id)
    if (!partida) continue

    if (!stats.has(pj.jogador_id)) {
      stats.set(pj.jogador_id, {
        jogador_id: pj.jogador_id,
        nome: jogador.nome,
        posicao_principal: jogador.posicao_principal as Posicao,
        jogos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        pontos: 0,
        gols: 0,
        aproveitamento: 0,
      })
    }

    const entry = stats.get(pj.jogador_id)!
    entry.jogos += 1
    entry.gols += golsMap.get(`${pj.jogador_id}:${pj.partida_id}`) ?? 0

    const tc = partida.times_escolhidos as TeamSplit | null
    const pA = partida.placar_time_a as number
    const pB = partida.placar_time_b as number

    if (tc) {
      const inTimeA = tc.time_a?.includes(pj.jogador_id) ?? false
      const inTimeB = tc.time_b?.includes(pj.jogador_id) ?? false

      if (inTimeA || inTimeB) {
        if (pA === pB) {
          entry.empates += 1
          entry.pontos += 1
        } else {
          const won = (inTimeA && pA > pB) || (inTimeB && pB > pA)
          if (won) {
            entry.vitorias += 1
            entry.pontos += 3
          } else {
            entry.derrotas += 1
          }
        }
      }
    }
  }

  const result = Array.from(stats.values())
    .filter(e => e.jogos > 0)
    .map(e => ({
      ...e,
      aproveitamento: Math.round((e.pontos / (e.jogos * 3)) * 1000) / 10,
    }))
    .sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || b.gols - a.gols)

  return Response.json(result)
}
