import { createClient } from '@/lib/supabase-server'
import type { ClassificacaoEntry, Posicao, TeamSplit } from '@/lib/supabase'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: temporadaId } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const dataInicio = searchParams.get('data_inicio')
  const dataFim = searchParams.get('data_fim')

  let partidasQuery = supabase
    .from('partidas')
    .select('id, data, placar_time_a, placar_time_b, times_escolhidos')
    .eq('temporada_id', temporadaId)
    .eq('status', 'realizada')
    .not('placar_time_a', 'is', null)
    .not('placar_time_b', 'is', null)
    .order('data', { ascending: true })

  if (dataInicio) partidasQuery = partidasQuery.gte('data', dataInicio)
  if (dataFim) partidasQuery = partidasQuery.lte('data', dataFim)

  const { data: partidas } = await partidasQuery

  if (!partidas || partidas.length === 0) return Response.json([])

  const partidaIds = partidas.map(p => p.id)

  const [pjsRes, golsRes, jogadoresRes, subsRes] = await Promise.all([
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
    supabase
      .from('substituicoes')
      .select('partida_id, jogador_ausente_id, jogador_substituto_id')
      .in('partida_id', partidaIds),
  ])

  const pjs = pjsRes.data ?? []
  const gols = golsRes.data ?? []
  const jogadores = jogadoresRes.data ?? []
  const subs = subsRes.data ?? []

  const subsMap = new Map<string, { ausentes: Map<string, string>; substitutos: Set<string> }>()
  for (const s of subs) {
    if (!subsMap.has(s.partida_id)) {
      subsMap.set(s.partida_id, { ausentes: new Map(), substitutos: new Set() })
    }
    const entry = subsMap.get(s.partida_id)!
    entry.ausentes.set(s.jogador_ausente_id, s.jogador_substituto_id)
    entry.substitutos.add(s.jogador_substituto_id)
  }

  const jogadorMap = new Map(jogadores.map(j => [j.id, j]))
  const partidaMap = new Map(partidas.map(p => [p.id, p]))

  const golsMap = new Map<string, number>()
  const golsContraMap = new Map<string, number>()
  for (const g of gols) {
    const key = `${g.jogador_id}:${g.partida_id}`
    if (g.gol_contra) {
      golsContraMap.set(key, (golsContraMap.get(key) ?? 0) + g.quantidade)
    } else {
      golsMap.set(key, (golsMap.get(key) ?? 0) + g.quantidade)
    }
  }

  const stats = new Map<string, ClassificacaoEntry>()
  // Track per-player results ordered by match date (partidas already ordered ascending)
  const historicoMap = new Map<string, ('V' | 'E' | 'D')[]>()

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
        gols_contra: 0,
        aproveitamento: 0,
        ultimos5: [],
      })
      historicoMap.set(pj.jogador_id, [])
    }

    const entry = stats.get(pj.jogador_id)!
    entry.jogos += 1
    entry.gols += golsMap.get(`${pj.jogador_id}:${pj.partida_id}`) ?? 0
    entry.gols_contra += golsContraMap.get(`${pj.jogador_id}:${pj.partida_id}`) ?? 0

    const tc = partida.times_escolhidos as TeamSplit | null
    const pA = partida.placar_time_a as number
    const pB = partida.placar_time_b as number

    let resultado: 'V' | 'E' | 'D' | null = null

    if (tc) {
      const partidaSubs = subsMap.get(pj.partida_id)
      const isAusente = partidaSubs?.ausentes.has(pj.jogador_id) ?? false
      const isSubstituto = partidaSubs?.substitutos.has(pj.jogador_id) ?? false

      let inTimeA = isAusente ? false : (tc.time_a?.includes(pj.jogador_id) ?? false)
      let inTimeB = isAusente ? false : (tc.time_b?.includes(pj.jogador_id) ?? false)

      if (isSubstituto && partidaSubs) {
        for (const [ausenteId, substitutoId] of partidaSubs.ausentes) {
          if (substitutoId === pj.jogador_id) {
            inTimeA = tc.time_a?.includes(ausenteId) ?? false
            inTimeB = tc.time_b?.includes(ausenteId) ?? false
            break
          }
        }
      }

      if (inTimeA || inTimeB) {
        if (pA === pB) {
          entry.empates += 1
          entry.pontos += 1
          resultado = 'E'
        } else {
          const won = (inTimeA && pA > pB) || (inTimeB && pB > pA)
          if (won) {
            entry.vitorias += 1
            entry.pontos += 3
            resultado = 'V'
          } else {
            entry.derrotas += 1
            resultado = 'D'
          }
        }
      }
    }

    if (resultado) {
      historicoMap.get(pj.jogador_id)!.push(resultado)
    }
  }

  // pjs are processed in insertion order which may not be date-sorted per player;
  // rebuild historico ordered by partida date
  const partidaOrder = new Map(partidas.map((p, i) => [p.id, i]))
  const historicoOrdenado = new Map<string, ('V' | 'E' | 'D')[]>()

  // Collect (index, result) per player then sort
  const historicoComIndex = new Map<string, { idx: number; resultado: 'V' | 'E' | 'D' }[]>()
  for (const pj of pjs) {
    const partida = partidaMap.get(pj.partida_id)
    if (!partida) continue
    const tc = partida.times_escolhidos as TeamSplit | null
    const pA = partida.placar_time_a as number
    const pB = partida.placar_time_b as number
    if (!tc) continue

    const partidaSubs2 = subsMap.get(pj.partida_id)
    const isAusente2 = partidaSubs2?.ausentes.has(pj.jogador_id) ?? false
    const isSubstituto2 = partidaSubs2?.substitutos.has(pj.jogador_id) ?? false

    let inTimeA = isAusente2 ? false : (tc.time_a?.includes(pj.jogador_id) ?? false)
    let inTimeB = isAusente2 ? false : (tc.time_b?.includes(pj.jogador_id) ?? false)

    if (isSubstituto2 && partidaSubs2) {
      for (const [ausenteId, substitutoId] of partidaSubs2.ausentes) {
        if (substitutoId === pj.jogador_id) {
          inTimeA = tc.time_a?.includes(ausenteId) ?? false
          inTimeB = tc.time_b?.includes(ausenteId) ?? false
          break
        }
      }
    }

    if (!inTimeA && !inTimeB) continue

    let resultado: 'V' | 'E' | 'D'
    if (pA === pB) {
      resultado = 'E'
    } else {
      resultado = ((inTimeA && pA > pB) || (inTimeB && pB > pA)) ? 'V' : 'D'
    }

    if (!historicoComIndex.has(pj.jogador_id)) historicoComIndex.set(pj.jogador_id, [])
    historicoComIndex.get(pj.jogador_id)!.push({ idx: partidaOrder.get(pj.partida_id) ?? 0, resultado })
  }

  for (const [jogadorId, items] of historicoComIndex) {
    const sorted = items.sort((a, b) => a.idx - b.idx).map(x => x.resultado)
    historicoOrdenado.set(jogadorId, sorted)
  }

  const result = Array.from(stats.values())
    .filter(e => e.jogos > 0)
    .map(e => {
      const historico = historicoOrdenado.get(e.jogador_id) ?? []
      return {
        ...e,
        aproveitamento: Math.round((e.pontos / (e.jogos * 3)) * 1000) / 10,
        ultimos5: historico.slice(-5),
      }
    })
    .sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || b.gols - a.gols)

  return Response.json(result)
}
