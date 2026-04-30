import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { TeamSplit, ClassificacaoEntry, Posicao } from '@/lib/supabase'
import type { ConfrontoEntry } from '@/app/api/temporadas/[id]/confrontos/route'
import type { PortalData, PortalPartida, PortalPagamento, PortalVotacao, PortalJogadorResumo } from '@/app/api/public/portal/[id]/route'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getPortalData(jogadorId: string): Promise<PortalData | null> {
  const { data: jogador } = await supabase
    .from('jogadores')
    .select('id, nome, posicao_principal, ativo')
    .eq('id', jogadorId)
    .eq('ativo', true)
    .single()

  if (!jogador) return null

  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id, nome, data_inicio, data_fim, valor_mensalidade, valor_diarista')
    .eq('ativa', true)
    .single()

  const { data: proximaPartida } = await supabase
    .from('partidas')
    .select('id, data, local, votacao_enquete_id')
    .eq('status', 'agendada')
    .order('data', { ascending: true })
    .limit(1)
    .single()

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

  // Busca todos os jogadores activos para usar em classificação e escalação
  const { data: todosJogadores } = await supabase
    .from('jogadores')
    .select('id, nome, posicao_principal')
    .eq('ativo', true)

  const jogadorMap = new Map((todosJogadores ?? []).map(j => [j.id, j]))

  let classificacao: ClassificacaoEntry[] = []
  let confrontos: ConfrontoEntry[] = []
  let partidas: PortalPartida[] = []

  if (temporada) {
    const { data: partidasData } = await supabase
      .from('partidas')
      .select('id, data, hora, duracao_minutos, local, status, nome_time_a, nome_time_b, placar_time_a, placar_time_b, times_escolhidos')
      .eq('temporada_id', temporada.id)
      .order('data', { ascending: false })

    const todasPartidasRaw = partidasData ?? []
    const realizadas = todasPartidasRaw.filter(
      p => p.status === 'realizada' && p.placar_time_a != null && p.placar_time_b != null
    )

    // Mapas partilhados entre escalação e classificação
    const golsPorJogadorPartida = new Map<string, { normal: number; contra: number }>()
    const subsMap = new Map<string, { ausentes: Map<string, string>; substitutos: Set<string> }>()

    if (realizadas.length > 0) {
      const realizadasIds = realizadas.map(p => p.id)

      const [pjsRes, golsRes, subsRes] = await Promise.all([
        supabase.from('partida_jogadores').select('partida_id, jogador_id').in('partida_id', realizadasIds),
        supabase.from('gols').select('partida_id, jogador_id, quantidade, gol_contra').in('partida_id', realizadasIds),
        supabase.from('substituicoes').select('partida_id, jogador_ausente_id, jogador_substituto_id').in('partida_id', realizadasIds),
      ])

      const pjs = pjsRes.data ?? []
      const gols = golsRes.data ?? []
      const subs = subsRes.data ?? []

      // Preenche mapa de gols
      for (const g of gols) {
        const key = `${g.partida_id}:${g.jogador_id}`
        const entry = golsPorJogadorPartida.get(key) ?? { normal: 0, contra: 0 }
        if (g.gol_contra) entry.contra += g.quantidade
        else entry.normal += g.quantidade
        golsPorJogadorPartida.set(key, entry)
      }

      for (const s of subs) {
        if (!subsMap.has(s.partida_id)) subsMap.set(s.partida_id, { ausentes: new Map(), substitutos: new Set() })
        const e = subsMap.get(s.partida_id)!
        e.ausentes.set(s.jogador_ausente_id, s.jogador_substituto_id)
        e.substitutos.add(s.jogador_substituto_id)
      }

      const realizadasAsc = [...realizadas].reverse()
      const partidaMap = new Map(realizadasAsc.map((p, i) => [p.id, { ...p, idx: i }]))

      // Alias para classificação (chave invertida: jogador:partida)
      const golsMap = new Map<string, number>()
      const golsContraMap = new Map<string, number>()
      for (const [key, val] of golsPorJogadorPartida) {
        const [pId, jId] = key.split(':')
        const altKey = `${jId}:${pId}`
        if (val.normal > 0) golsMap.set(altKey, val.normal)
        if (val.contra > 0) golsContraMap.set(altKey, val.contra)
      }

      const stats = new Map<string, ClassificacaoEntry>()
      const historicoComIndex = new Map<string, { idx: number; resultado: 'V' | 'E' | 'D' }[]>()

      for (const pj of pjs) {
        const jog = jogadorMap.get(pj.jogador_id)
        if (!jog) continue
        const partidaInfo = partidaMap.get(pj.partida_id)
        if (!partidaInfo) continue

        if (!stats.has(pj.jogador_id)) {
          stats.set(pj.jogador_id, {
            jogador_id: pj.jogador_id,
            nome: jog.nome,
            posicao_principal: jog.posicao_principal as Posicao,
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

    // Resolve escalação final (com substituições aplicadas)
    partidas = todasPartidasRaw.map(p => {
      const tc = p.times_escolhidos as TeamSplit | null
      let escalacao: PortalPartida['escalacao'] = null
      if (tc) {
        const sub = subsMap.get(p.id)
        const ausenteIds = new Set(sub?.ausentes.keys() ?? [])

        const makeEntry = (id: string): PortalJogadorResumo | null => {
          const j = jogadorMap.get(id)
          if (!j) return null
          const g = golsPorJogadorPartida.get(`${p.id}:${id}`)
          return { id, nome: j.nome, posicao: j.posicao_principal, gols: g?.normal, gols_contra: g?.contra }
        }

        // Jogadores originais sem os ausentes
        const timeABase = (tc.time_a ?? []).filter(id => !ausenteIds.has(id)).flatMap(id => makeEntry(id) ?? [])
        const timeBBase = (tc.time_b ?? []).filter(id => !ausenteIds.has(id)).flatMap(id => makeEntry(id) ?? [])

        // Substitutos adicionados ao time do ausente
        if (sub) {
          for (const [ausenteId, substitutoId] of sub.ausentes) {
            const entry = makeEntry(substitutoId)
            if (!entry) continue
            if ((tc.time_a ?? []).includes(ausenteId)) timeABase.push(entry)
            else if ((tc.time_b ?? []).includes(ausenteId)) timeBBase.push(entry)
          }
        }

        escalacao = { time_a: timeABase, time_b: timeBBase }
      }
      return { ...p, escalacao }
    }) as PortalPartida[]
  }

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

  return {
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
  }
}
