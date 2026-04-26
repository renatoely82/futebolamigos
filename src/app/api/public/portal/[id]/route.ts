import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { TeamSplit, ClassificacaoEntry, Posicao } from '@/lib/supabase'
import type { ConfrontoEntry } from '@/app/api/temporadas/[id]/confrontos/route'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Params = { params: Promise<{ id: string }> }

export type PortalPartida = {
  id: string
  data: string
  local: string | null
  status: string
  nome_time_a: string
  nome_time_b: string
  placar_time_a: number | null
  placar_time_b: number | null
  times_escolhidos: TeamSplit | null
}

export type PortalPagamento = {
  tipo: 'mensalista' | 'diarista'
  descricao: string
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
  votacao: PortalVotacao
  classificacao: ClassificacaoEntry[]
  confrontos: ConfrontoEntry[]
  partidas: PortalPartida[]
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

  // Próxima partida agendada (qualquer temporada)
  const { data: proximaPartida } = await supabase
    .from('partidas')
    .select('id, data, local, votacao_enquete_id')
    .eq('status', 'agendada')
    .order('data', { ascending: true })
    .limit(1)
    .single()

  // Convocatória
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

  // Votação aberta
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

  // ─── Dados da temporada ativa ────────────────────────────────────────────────
  let classificacao: ClassificacaoEntry[] = []
  let confrontos: ConfrontoEntry[] = []
  let partidas: PortalPartida[] = []

  if (temporada) {
    const [partidasRes] = await Promise.all([
      supabase
        .from('partidas')
        .select('id, data, local, status, nome_time_a, nome_time_b, placar_time_a, placar_time_b, times_escolhidos')
        .eq('temporada_id', temporada.id)
        .order('data', { ascending: false }),
    ])

    partidas = (partidasRes.data ?? []) as PortalPartida[]

    const realizadas = partidas.filter(
      p => p.status === 'realizada' && p.placar_time_a != null && p.placar_time_b != null
    )

    if (realizadas.length > 0) {
      const realizadasIds = realizadas.map(p => p.id)

      const [pjsRes, golsRes, jogadoresRes, subsRes] = await Promise.all([
        supabase.from('partida_jogadores').select('partida_id, jogador_id').in('partida_id', realizadasIds),
        supabase.from('gols').select('partida_id, jogador_id, quantidade, gol_contra').in('partida_id', realizadasIds),
        supabase.from('jogadores').select('id, nome, posicao_principal').eq('ativo', true),
        supabase.from('substituicoes').select('partida_id, jogador_ausente_id, jogador_substituto_id').in('partida_id', realizadasIds),
      ])

      const pjs = pjsRes.data ?? []
      const gols = golsRes.data ?? []
      const jogadores = jogadoresRes.data ?? []
      const subs = subsRes.data ?? []

      const subsMap = new Map<string, { ausentes: Map<string, string>; substitutos: Set<string> }>()
      for (const s of subs) {
        if (!subsMap.has(s.partida_id)) subsMap.set(s.partida_id, { ausentes: new Map(), substitutos: new Set() })
        const e = subsMap.get(s.partida_id)!
        e.ausentes.set(s.jogador_ausente_id, s.jogador_substituto_id)
        e.substitutos.add(s.jogador_substituto_id)
      }

      const jogadorMap = new Map(jogadores.map(j => [j.id, j]))
      // partidas ordered desc from query — reverse for chronological processing
      const realizadasAsc = [...realizadas].reverse()
      const partidaMap = new Map(realizadasAsc.map((p, i) => [p.id, { ...p, idx: i }]))

      const golsMap = new Map<string, number>()
      const golsContraMap = new Map<string, number>()
      for (const g of gols) {
        const key = `${g.jogador_id}:${g.partida_id}`
        if (g.gol_contra) golsContraMap.set(key, (golsContraMap.get(key) ?? 0) + g.quantidade)
        else golsMap.set(key, (golsMap.get(key) ?? 0) + g.quantidade)
      }

      const stats = new Map<string, ClassificacaoEntry>()
      const historicoComIndex = new Map<string, { idx: number; resultado: 'V' | 'E' | 'D' }[]>()

      for (const pj of pjs) {
        const jogador = jogadorMap.get(pj.jogador_id)
        if (!jogador) continue
        const partidaInfo = partidaMap.get(pj.partida_id)
        if (!partidaInfo) continue

        if (!stats.has(pj.jogador_id)) {
          stats.set(pj.jogador_id, {
            jogador_id: pj.jogador_id,
            nome: jogador.nome,
            posicao_principal: jogador.posicao_principal as Posicao,
            jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
            pontos: 0, gols: 0, gols_contra: 0, aproveitamento: 0, ultimos5: [],
          })
        }

        const entry = stats.get(pj.jogador_id)!
        entry.jogos += 1
        entry.gols += golsMap.get(`${pj.jogador_id}:${pj.partida_id}`) ?? 0
        entry.gols_contra += golsContraMap.get(`${pj.jogador_id}:${pj.partida_id}`) ?? 0

        const tc = partidaInfo.times_escolhidos as TeamSplit | null
        if (!tc) continue
        const pA = partidaInfo.placar_time_a as number
        const pB = partidaInfo.placar_time_b as number

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

        let resultado: 'V' | 'E' | 'D'
        if (pA === pB) { resultado = 'E'; entry.empates += 1; entry.pontos += 1 }
        else if ((inA && pA > pB) || (inB && pB > pA)) { resultado = 'V'; entry.vitorias += 1; entry.pontos += 3 }
        else { resultado = 'D'; entry.derrotas += 1 }

        if (!historicoComIndex.has(pj.jogador_id)) historicoComIndex.set(pj.jogador_id, [])
        historicoComIndex.get(pj.jogador_id)!.push({ idx: partidaInfo.idx, resultado })
      }

      classificacao = Array.from(stats.values())
        .filter(e => e.jogos > 0)
        .map(e => {
          const historico = (historicoComIndex.get(e.jogador_id) ?? [])
            .sort((a, b) => a.idx - b.idx)
            .map(h => h.resultado)
          return {
            ...e,
            aproveitamento: Math.round((e.pontos / (e.jogos * 3)) * 1000) / 10,
            ultimos5: historico.slice(-5),
          }
        })
        .sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || b.gols - a.gols)

      // ─── Confrontos ──────────────────────────────────────────────────────────
      const confrontoMap = new Map<string, ConfrontoEntry>()
      for (const p of realizadas) {
        const nA = p.nome_time_a ?? 'Time A'
        const nB = p.nome_time_b ?? 'Time B'
        const pA = p.placar_time_a as number
        const pB = p.placar_time_b as number
        const [first, second, gF, gS] =
          nA.localeCompare(nB, 'pt-BR') <= 0 ? [nA, nB, pA, pB] : [nB, nA, pB, pA]
        const key = `${first}||${second}`
        const entry = confrontoMap.get(key) ?? { time_a: first, time_b: second, jogos: 0, vitorias_a: 0, vitorias_b: 0, empates: 0, gols_a: 0, gols_b: 0 }
        entry.jogos++; entry.gols_a += gF; entry.gols_b += gS
        if (gF > gS) entry.vitorias_a++
        else if (gS > gF) entry.vitorias_b++
        else entry.empates++
        confrontoMap.set(key, entry)
      }
      confrontos = Array.from(confrontoMap.values()).sort((a, b) => b.jogos - a.jogos || a.time_a.localeCompare(b.time_a, 'pt-BR'))
    }
  }

  // ─── Pagamentos ──────────────────────────────────────────────────────────────
  const pagamentos: PortalPagamento[] = []
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  if (temporada) {
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
        pagamentos.push({ tipo: 'mensalista', descricao: `${MESES[pg.mes - 1]} ${pg.ano}`, pago: pg.pago, valor_pago: pg.valor_pago })
      }
    }

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
        pagamentos.push({ tipo: 'diarista', descricao: `${dia}/${mes}/${ano}`, pago: pg?.pago ?? false, valor_pago: pg?.valor_pago ?? null })
      }
    }
  }

  return Response.json({
    jogador: { id: jogador.id, nome: jogador.nome, posicao_principal: jogador.posicao_principal },
    temporada: temporada ? { id: temporada.id, nome: temporada.nome } : null,
    proxima_partida: proximaPartida
      ? { id: proximaPartida.id, data: proximaPartida.data, local: proximaPartida.local, convocado }
      : null,
    votacao,
    classificacao,
    confrontos,
    partidas,
    pagamentos,
  } satisfies PortalData)
}
