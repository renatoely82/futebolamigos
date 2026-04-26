import { createClient } from '@/lib/supabase-server'
import type { TeamSplit } from '@/lib/supabase'

export interface EvolucaoSerie {
  id: string
  nome: string
  pontos: number[] // cumulative points after each match, length === labels.length
}

export interface EvolucaoData {
  labels: { data: string; label: string }[]
  series: EvolucaoSerie[]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  if (!partidas || partidas.length === 0) return Response.json({ labels: [], series: [] })

  const partidaIds = partidas.map(p => p.id)

  const [pjsRes, jogadoresRes, subsRes] = await Promise.all([
    supabase
      .from('partida_jogadores')
      .select('partida_id, jogador_id')
      .in('partida_id', partidaIds),
    supabase
      .from('jogadores')
      .select('id, nome')
      .eq('ativo', true),
    supabase
      .from('substituicoes')
      .select('partida_id, jogador_ausente_id, jogador_substituto_id')
      .in('partida_id', partidaIds),
  ])

  const pjs = pjsRes.data ?? []
  const jogadores = jogadoresRes.data ?? []
  const subs = subsRes.data ?? []

  const jogadorMap = new Map(jogadores.map(j => [j.id, j]))

  // Build substitution maps per match
  const subsMap = new Map<string, { ausentes: Map<string, string>; substitutos: Set<string> }>()
  for (const s of subs) {
    if (!subsMap.has(s.partida_id)) {
      subsMap.set(s.partida_id, { ausentes: new Map(), substitutos: new Set() })
    }
    const entry = subsMap.get(s.partida_id)!
    entry.ausentes.set(s.jogador_ausente_id, s.jogador_substituto_id)
    entry.substitutos.add(s.jogador_substituto_id)
  }

  // Group partida_jogadores by match
  const pjsByPartida = new Map<string, string[]>()
  for (const pj of pjs) {
    if (!pjsByPartida.has(pj.partida_id)) pjsByPartida.set(pj.partida_id, [])
    pjsByPartida.get(pj.partida_id)!.push(pj.jogador_id)
  }

  // Collect all players who appear in at least one match
  const allPlayerIds = new Set(pjs.map(pj => pj.jogador_id))
  const playerPoints = new Map<string, number>() // running cumulative total
  const playerSeries = new Map<string, number[]>() // one entry per match
  for (const pid of allPlayerIds) {
    playerPoints.set(pid, 0)
    playerSeries.set(pid, [])
  }

  // Process each match in chronological order
  for (const partida of partidas) {
    const tc = partida.times_escolhidos as TeamSplit | null
    const pA = partida.placar_time_a as number
    const pB = partida.placar_time_b as number
    const jogadoresNaPartida = pjsByPartida.get(partida.id) ?? []
    const partidaSubs = subsMap.get(partida.id)

    for (const jogadorId of jogadoresNaPartida) {
      let pts = 0

      if (tc) {
        const isAusente = partidaSubs?.ausentes.has(jogadorId) ?? false
        const isSubstituto = partidaSubs?.substitutos.has(jogadorId) ?? false

        let inTimeA = isAusente ? false : (tc.time_a?.includes(jogadorId) ?? false)
        let inTimeB = isAusente ? false : (tc.time_b?.includes(jogadorId) ?? false)

        if (isSubstituto && partidaSubs) {
          for (const [ausenteId, substitutoId] of partidaSubs.ausentes) {
            if (substitutoId === jogadorId) {
              inTimeA = tc.time_a?.includes(ausenteId) ?? false
              inTimeB = tc.time_b?.includes(ausenteId) ?? false
              break
            }
          }
        }

        if (inTimeA || inTimeB) {
          if (pA === pB) {
            pts = 1
          } else {
            pts = (inTimeA && pA > pB) || (inTimeB && pB > pA) ? 3 : 0
          }
        }
      }

      playerPoints.set(jogadorId, (playerPoints.get(jogadorId) ?? 0) + pts)
    }

    // After each match, record cumulative totals for all players (carry-forward for absent ones)
    for (const [pid, series] of playerSeries) {
      series.push(playerPoints.get(pid) ?? 0)
    }
  }

  const labels = partidas.map(p => ({
    data: p.data,
    label: new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }))

  // Sort series by final cumulative points desc, filter out players with 0 total
  const series: EvolucaoSerie[] = Array.from(playerSeries.entries())
    .map(([id, pontos]) => ({ id, nome: jogadorMap.get(id)?.nome ?? id, pontos }))
    .filter(s => s.pontos[s.pontos.length - 1] > 0)
    .sort((a, b) => (b.pontos[b.pontos.length - 1] ?? 0) - (a.pontos[a.pontos.length - 1] ?? 0))

  return Response.json({ labels, series } satisfies EvolucaoData)
}
