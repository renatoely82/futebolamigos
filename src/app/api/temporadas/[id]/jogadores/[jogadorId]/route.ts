import { createClient } from '@/lib/supabase-server'
import type { TeamSplit } from '@/lib/supabase'

export interface JogadorPartidaEntry {
  partida_id: string
  data: string
  local: string | null
  nome_time_a: string
  nome_time_b: string
  placar_time_a: number | null
  placar_time_b: number | null
  gols_marcados: number
  gols_contra: number
  resultado: 'V' | 'E' | 'D' | null
}

export interface JogadorTemporadaData {
  partidas: JogadorPartidaEntry[]
  totalPartidasTemporada: number
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; jogadorId: string }> }
) {
  const { id: temporadaId, jogadorId } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const dataInicio = searchParams.get('data_inicio')
  const dataFim = searchParams.get('data_fim')

  let partidasQuery = supabase
    .from('partidas')
    .select('id, data, local, placar_time_a, placar_time_b, nome_time_a, nome_time_b, times_escolhidos')
    .eq('temporada_id', temporadaId)
    .eq('status', 'realizada')
    .not('placar_time_a', 'is', null)
    .not('placar_time_b', 'is', null)
    .order('data', { ascending: false })

  if (dataInicio) partidasQuery = partidasQuery.gte('data', dataInicio)
  if (dataFim) partidasQuery = partidasQuery.lte('data', dataFim)

  const { data: partidas } = await partidasQuery

  if (!partidas || partidas.length === 0) return Response.json([])

  const partidaIds = partidas.map(p => p.id)

  const [pjsRes, golsRes] = await Promise.all([
    supabase
      .from('partida_jogadores')
      .select('partida_id, jogador_id')
      .in('partida_id', partidaIds)
      .eq('jogador_id', jogadorId),
    supabase
      .from('gols')
      .select('partida_id, jogador_id, quantidade, gol_contra')
      .in('partida_id', partidaIds)
      .eq('jogador_id', jogadorId),
  ])

  const participacoes = new Set((pjsRes.data ?? []).map(pj => pj.partida_id))
  const gols = golsRes.data ?? []

  const golsMap = new Map<string, number>()
  const golsContraMap = new Map<string, number>()
  for (const g of gols) {
    if (g.gol_contra) {
      golsContraMap.set(g.partida_id, (golsContraMap.get(g.partida_id) ?? 0) + g.quantidade)
    } else {
      golsMap.set(g.partida_id, (golsMap.get(g.partida_id) ?? 0) + g.quantidade)
    }
  }

  const result: JogadorPartidaEntry[] = []

  for (const p of partidas) {
    if (!participacoes.has(p.id)) continue

    const tc = p.times_escolhidos as TeamSplit | null
    const pA = p.placar_time_a as number
    const pB = p.placar_time_b as number

    let resultado: 'V' | 'E' | 'D' | null = null
    if (tc) {
      const inTimeA = tc.time_a?.includes(jogadorId) ?? false
      const inTimeB = tc.time_b?.includes(jogadorId) ?? false
      if (inTimeA || inTimeB) {
        if (pA === pB) {
          resultado = 'E'
        } else {
          const won = (inTimeA && pA > pB) || (inTimeB && pB > pA)
          resultado = won ? 'V' : 'D'
        }
      }
    }

    result.push({
      partida_id: p.id,
      data: p.data,
      local: p.local,
      nome_time_a: p.nome_time_a,
      nome_time_b: p.nome_time_b,
      placar_time_a: p.placar_time_a,
      placar_time_b: p.placar_time_b,
      gols_marcados: golsMap.get(p.id) ?? 0,
      gols_contra: golsContraMap.get(p.id) ?? 0,
      resultado,
    })
  }

  const response: JogadorTemporadaData = {
    partidas: result,
    totalPartidasTemporada: partidas.length,
  }
  return Response.json(response)
}
