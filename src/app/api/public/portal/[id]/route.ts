import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { TeamSplit } from '@/lib/supabase'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Params = { params: Promise<{ id: string }> }

export type PortalPagamento = {
  tipo: 'mensalista' | 'diarista'
  descricao: string   // "Janeiro 2026" ou "12/04/2026"
  pago: boolean
  valor_pago: number | null
}

export type PortalVotacao = {
  enquete_id: string
  token: string
} | null

export type PortalData = {
  jogador: { id: string; nome: string; posicao_principal: string }
  temporada: { id: string; nome: string } | null
  proxima_partida: {
    id: string
    data: string
    local: string | null
    convocado: boolean
  } | null
  classificacao: {
    posicao: number
    pontos: number
    jogos: number
    vitorias: number
    empates: number
    derrotas: number
    gols: number
    aproveitamento: number
    ultimos5: ('V' | 'E' | 'D')[]
  } | null
  votacao: PortalVotacao
  pagamentos: PortalPagamento[]
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id: jogadorId } = await params
  const token = request.nextUrl.searchParams.get('token')

  if (!token) return Response.json({ error: 'Token obrigatório' }, { status: 400 })

  // Valida jogador + token
  const { data: jogador } = await supabase
    .from('jogadores')
    .select('id, nome, posicao_principal, portal_token, ativo')
    .eq('id', jogadorId)
    .eq('portal_token', token)
    .eq('ativo', true)
    .single()

  if (!jogador) return Response.json({ error: 'Link inválido' }, { status: 401 })

  // Temporada ativa
  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id, nome, data_inicio, data_fim, valor_mensalidade, valor_diarista')
    .eq('ativa', true)
    .single()

  // Próxima partida agendada
  const { data: proximaPartida } = await supabase
    .from('partidas')
    .select('id, data, local, votacao_enquete_id')
    .eq('status', 'agendada')
    .order('data', { ascending: true })
    .limit(1)
    .single()

  // Convocatória da próxima partida
  let convocado = false
  if (proximaPartida) {
    const { data: pj } = await supabase
      .from('partida_jogadores')
      .select('id')
      .eq('partida_id', proximaPartida.id)
      .eq('jogador_id', jogadorId)
      .single()
    convocado = !!pj
  }

  // Votação aberta na próxima partida
  let votacao: PortalVotacao = null
  if (proximaPartida?.votacao_enquete_id) {
    const { data: enquete } = await supabase
      .from('enquetes')
      .select('id, ativa')
      .eq('id', proximaPartida.votacao_enquete_id)
      .single()

    if (enquete?.ativa) {
      const { data: tokenRow } = await supabase
        .from('enquete_tokens')
        .select('token, usado')
        .eq('enquete_id', enquete.id)
        .eq('jogador_id', jogadorId)
        .single()

      if (tokenRow && !tokenRow.usado) {
        votacao = { enquete_id: enquete.id, token: tokenRow.token }
      }
    }
  }

  // Classificação na temporada ativa
  let classificacao: PortalData['classificacao'] = null
  if (temporada) {
    const { data: partidas } = await supabase
      .from('partidas')
      .select('id, placar_time_a, placar_time_b, times_escolhidos')
      .eq('temporada_id', temporada.id)
      .eq('status', 'realizada')
      .not('placar_time_a', 'is', null)
      .not('placar_time_b', 'is', null)
      .order('data', { ascending: true })

    if (partidas && partidas.length > 0) {
      const partidaIds = partidas.map(p => p.id)

      const [pjsRes, subsRes] = await Promise.all([
        supabase
          .from('partida_jogadores')
          .select('partida_id, jogador_id')
          .in('partida_id', partidaIds),
        supabase
          .from('substituicoes')
          .select('partida_id, jogador_ausente_id, jogador_substituto_id')
          .in('partida_id', partidaIds),
      ])

      const pjs = pjsRes.data ?? []
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

      const partidaMap = new Map(partidas.map(p => [p.id, p]))

      // Stats globais (para posição na tabela)
      const statsMap = new Map<string, { pontos: number; jogos: number; vitorias: number; empates: number; derrotas: number; gols: number }>()
      const allJogadorIds = [...new Set(pjs.map(pj => pj.jogador_id))]
      for (const jid of allJogadorIds) {
        statsMap.set(jid, { pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, gols: 0 })
      }

      const { data: golsAll } = await supabase
        .from('gols')
        .select('partida_id, jogador_id, quantidade, gol_contra')
        .in('partida_id', partidaIds)
        .eq('gol_contra', false)

      const golsMap = new Map<string, number>()
      for (const g of golsAll ?? []) {
        const key = `${g.jogador_id}:${g.partida_id}`
        golsMap.set(key, (golsMap.get(key) ?? 0) + g.quantidade)
      }

      const historicoJogador: { idx: number; resultado: 'V' | 'E' | 'D' }[] = []

      for (const pj of pjs) {
        const partida = partidaMap.get(pj.partida_id)
        if (!partida) continue
        const tc = partida.times_escolhidos as TeamSplit | null
        if (!tc) continue

        const pA = partida.placar_time_a as number
        const pB = partida.placar_time_b as number
        const entry = statsMap.get(pj.jogador_id)
        if (!entry) continue

        const sub = subsMap.get(pj.partida_id)
        const isAusente = sub?.ausentes.has(pj.jogador_id) ?? false
        const isSubstituto = sub?.substitutos.has(pj.jogador_id) ?? false

        let inA = isAusente ? false : (tc.time_a?.includes(pj.jogador_id) ?? false)
        let inB = isAusente ? false : (tc.time_b?.includes(pj.jogador_id) ?? false)

        if (isSubstituto && sub) {
          for (const [ausenteId, substitutoId] of sub.ausentes) {
            if (substitutoId === pj.jogador_id) {
              inA = tc.time_a?.includes(ausenteId) ?? false
              inB = tc.time_b?.includes(ausenteId) ?? false
              break
            }
          }
        }

        if (!inA && !inB) continue

        entry.jogos += 1
        entry.gols += golsMap.get(`${pj.jogador_id}:${pj.partida_id}`) ?? 0

        let resultado: 'V' | 'E' | 'D'
        if (pA === pB) {
          resultado = 'E'; entry.empates += 1; entry.pontos += 1
        } else if ((inA && pA > pB) || (inB && pB > pA)) {
          resultado = 'V'; entry.vitorias += 1; entry.pontos += 3
        } else {
          resultado = 'D'; entry.derrotas += 1
        }

        if (pj.jogador_id === jogadorId) {
          const idx = partidas.findIndex(p => p.id === pj.partida_id)
          historicoJogador.push({ idx, resultado })
        }
      }

      const meuStats = statsMap.get(jogadorId)
      if (meuStats && meuStats.jogos > 0) {
        // Posição na tabela (quantos jogadores têm mais pontos)
        const ranking = Array.from(statsMap.values())
          .filter(s => s.jogos > 0)
          .sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || b.gols - a.gols)
        const posicao = ranking.findIndex(s => s === meuStats) + 1

        const ultimos5 = historicoJogador
          .sort((a, b) => a.idx - b.idx)
          .slice(-5)
          .map(h => h.resultado)

        classificacao = {
          posicao,
          pontos: meuStats.pontos,
          jogos: meuStats.jogos,
          vitorias: meuStats.vitorias,
          empates: meuStats.empates,
          derrotas: meuStats.derrotas,
          gols: meuStats.gols,
          aproveitamento: Math.round((meuStats.pontos / (meuStats.jogos * 3)) * 1000) / 10,
          ultimos5,
        }
      }
    }
  }

  // Pagamentos (temporada ativa)
  const pagamentos: PortalPagamento[] = []
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  if (temporada) {
    // Mensalista?
    const { data: mensalista } = await supabase
      .from('temporada_mensalistas')
      .select('meses')
      .eq('temporada_id', temporada.id)
      .eq('jogador_id', jogadorId)
      .single()

    if (mensalista) {
      const { data: pgsMensalistas } = await supabase
        .from('pagamentos_mensalistas')
        .select('mes, ano, pago, valor_pago')
        .eq('temporada_id', temporada.id)
        .eq('jogador_id', jogadorId)
        .order('ano', { ascending: true })
        .order('mes', { ascending: true })

      for (const pg of pgsMensalistas ?? []) {
        pagamentos.push({
          tipo: 'mensalista',
          descricao: `${MESES[pg.mes - 1]} ${pg.ano}`,
          pago: pg.pago,
          valor_pago: pg.valor_pago,
        })
      }
    }

    // Diarista: partidas realizadas onde esteve presente
    const { data: partidasRealizadas } = await supabase
      .from('partidas')
      .select('id, data')
      .eq('temporada_id', temporada.id)
      .eq('status', 'realizada')
      .order('data', { ascending: false })
      .limit(10)

    if (partidasRealizadas && partidasRealizadas.length > 0) {
      const { data: presencas } = await supabase
        .from('partida_jogadores')
        .select('partida_id')
        .eq('jogador_id', jogadorId)
        .in('partida_id', partidasRealizadas.map(p => p.id))

      const presencaIds = new Set((presencas ?? []).map(p => p.partida_id))

      const { data: pgsDiaristas } = await supabase
        .from('pagamentos_diaristas')
        .select('partida_id, pago, valor_pago')
        .eq('jogador_id', jogadorId)
        .in('partida_id', [...presencaIds])

      const pgsDiaristasMap = new Map((pgsDiaristas ?? []).map(p => [p.partida_id, p]))

      for (const partida of partidasRealizadas) {
        if (!presencaIds.has(partida.id)) continue
        const pg = pgsDiaristasMap.get(partida.id)
        const [ano, mes, dia] = partida.data.split('-')
        pagamentos.push({
          tipo: 'diarista',
          descricao: `${dia}/${mes}/${ano}`,
          pago: pg?.pago ?? false,
          valor_pago: pg?.valor_pago ?? null,
        })
      }
    }
  }

  const result: PortalData = {
    jogador: { id: jogador.id, nome: jogador.nome, posicao_principal: jogador.posicao_principal },
    temporada: temporada ? { id: temporada.id, nome: temporada.nome } : null,
    proxima_partida: proximaPartida
      ? { id: proximaPartida.id, data: proximaPartida.data, local: proximaPartida.local, convocado }
      : null,
    classificacao,
    votacao,
    pagamentos,
  }

  return Response.json(result)
}
