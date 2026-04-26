import { createClient } from '@/lib/supabase-server'
import { singleJoin } from '@/lib/supabase'

export interface RelatorioPorMes {
  mes: number
  ano: number
  label: string
  mensalistasRecebido: number
  mensalistasEsperado: number
  diaristasRecebido: number
  diaristasEsperado: number
  totalRecebido: number
  totalEsperado: number
}

export interface RelatorioJogadorPendente {
  jogador_id: string
  nome: string
  pendenteMensalista: number
  pendenteDiarista: number
  total: number
}

export interface RelatorioFinanceiro {
  totalRecebido: number
  totalEsperado: number
  totalPendente: number
  taxaPagamento: number
  mensalistas: {
    recebido: number
    esperado: number
    pendente: number
    nPagos: number
    nTotal: number
  }
  diaristas: {
    recebido: number
    esperado: number
    pendente: number
    nPagos: number
    nTotal: number
    nIsentos: number
  }
  porForma: {
    CASH: number
    BIZUM: number
    PIX: number
    sem_forma: number
  }
  porMes: RelatorioPorMes[]
  pendentes: RelatorioJogadorPendente[]
}

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: temporadaId } = await params
  const supabase = await createClient()

  // Fetch all data in parallel
  const [
    temporadaRes,
    valoresMesRes,
    mensalistasRes,
    pagMensalistasRes,
    partidasRes,
  ] = await Promise.all([
    supabase.from('temporadas').select('id, nome, valor_mensalidade, valor_diarista, data_inicio, data_fim').eq('id', temporadaId).single(),
    supabase.from('temporada_valores_mes').select('mes, ano, valor_mensalidade, valor_diarista').eq('temporada_id', temporadaId),
    supabase.from('temporada_mensalistas').select('jogador_id, meses, jogador:jogadores(id, nome)').eq('temporada_id', temporadaId),
    supabase.from('pagamentos_mensalistas').select('jogador_id, mes, ano, pago, valor_pago, credito, forma_pagamento').eq('temporada_id', temporadaId),
    supabase.from('partidas').select('id, data').eq('temporada_id', temporadaId).order('data', { ascending: true }),
  ])

  const temporada = temporadaRes.data
  if (!temporada) return Response.json({ error: 'Temporada não encontrada' }, { status: 404 })
  const t = temporada // narrow: guaranteed non-null below

  const valoresMes = valoresMesRes.data ?? []
  const mensalistas = mensalistasRes.data ?? []
  const pagMensalistas = pagMensalistasRes.data ?? []
  const partidas = partidasRes.data ?? []

  // Fetch diarista data only if there are matches
  let pagDiaristas: {
    partida_id: string; jogador_id: string; pago: boolean
    valor_pago: number | null; forma_pagamento: string | null; isento: boolean
  }[] = []
  let pjDiaristas: { partida_id: string; jogador_id: string; nome: string; posicao_principal: string }[] = []

  if (partidas.length > 0) {
    const partidaIds = partidas.map(p => p.id)
    const [pdRes, pjRes] = await Promise.all([
      supabase.from('pagamentos_diaristas').select('partida_id, jogador_id, pago, valor_pago, forma_pagamento, isento').in('partida_id', partidaIds),
      supabase.from('partida_jogadores').select('partida_id, jogador_id, jogador:jogadores(id, nome, posicao_principal)').in('partida_id', partidaIds),
    ])
    pagDiaristas = (pdRes.data ?? []) as typeof pagDiaristas
    pjDiaristas = ((pjRes.data ?? []) as unknown as { partida_id: string; jogador_id: string; jogador: { id: string; nome: string; posicao_principal: string } }[])
      .map(pj => ({
        partida_id: pj.partida_id,
        jogador_id: pj.jogador_id,
        nome: (pj.jogador as { nome: string })?.nome ?? '',
        posicao_principal: (pj.jogador as { posicao_principal: string })?.posicao_principal ?? '',
      }))
  }

  // --- Helper: resolve monthly values (override > temporada default > 0) ---
  const valoresMap = new Map(valoresMes.map(v => [`${v.ano}-${v.mes}`, v]))
  function getValores(mes: number, ano: number) {
    const ov = valoresMap.get(`${ano}-${mes}`)
    return {
      mensalidade: ov?.valor_mensalidade ?? t.valor_mensalidade ?? 0,
      diarista: ov?.valor_diarista ?? t.valor_diarista ?? 0,
    }
  }

  // --- Helper: get all month-year pairs in the season range ---
  function getMesesTemporada() {
    const result: { mes: number; ano: number }[] = []
    const inicio = new Date(t.data_inicio + 'T00:00:00')
    const fim = new Date(t.data_fim + 'T00:00:00')
    const cur = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
    while (cur <= fim) {
      result.push({ mes: cur.getMonth() + 1, ano: cur.getFullYear() })
      cur.setMonth(cur.getMonth() + 1)
    }
    return result
  }
  const mesesTemporada = getMesesTemporada()
  const todosOsMeses = new Set(mesesTemporada.map(m => m.mes))

  // --- Mensalistas: determine active months per player ---
  const mensalistasAtivos = mensalistas.map(m => ({
    jogador_id: m.jogador_id,
    nome: singleJoin<{ nome: string }>(m.jogador)?.nome ?? m.jogador_id,
    mesesAtivos: (m.meses as number[] | null) ?? [...todosOsMeses],
  }))

  // --- Pagamentos mensalistas: index by jogador_id + mes + ano ---
  const pagMenMap = new Map(pagMensalistas.map(p => [`${p.jogador_id}-${p.mes}-${p.ano}`, p]))

  function computeRecebidoMensalista(
    pag: typeof pagMensalistas[number] | undefined,
    esperado: number
  ): number {
    if (!pag) return 0
    if (pag.valor_pago !== null) return Number(pag.valor_pago) + Number(pag.credito ?? 0)
    if (pag.pago) return esperado // legacy record
    return Number(pag.credito ?? 0)
  }

  // --- Mensalistas: set of jogador_ids active per month ---
  const mensalistasNoMes = new Map<string, Set<string>>()
  for (const m of mensalistasAtivos) {
    for (const mes of m.mesesAtivos) {
      const key = `${mes}`
      if (!mensalistasNoMes.has(key)) mensalistasNoMes.set(key, new Set())
      mensalistasNoMes.get(key)!.add(m.jogador_id)
    }
  }

  // --- Pagamentos diaristas: index by partida_id + jogador_id ---
  const pagDiarMap = new Map(pagDiaristas.map(p => [`${p.partida_id}:${p.jogador_id}`, p]))

  // --- Partidas indexed by date month/year ---
  const partidasMes = new Map<string, { id: string; data: string }[]>()
  for (const p of partidas) {
    const d = new Date(p.data + 'T12:00:00')
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    if (!partidasMes.has(key)) partidasMes.set(key, [])
    partidasMes.get(key)!.push(p)
  }

  // --- Build per-month breakdown ---
  const porForma = { CASH: 0, BIZUM: 0, PIX: 0, sem_forma: 0 }

  // Aggregate mensalista forma de pagamento
  for (const pag of pagMensalistas) {
    const recebido = computeRecebidoMensalista(pag, getValores(pag.mes, pag.ano).mensalidade)
    if (recebido > 0) {
      const forma = pag.forma_pagamento as keyof typeof porForma | null
      if (forma && forma in porForma) porForma[forma] += recebido
      else porForma.sem_forma += recebido
    }
  }

  // Aggregate diarista forma de pagamento
  for (const pag of pagDiaristas) {
    if (!pag.isento && (pag.valor_pago ?? 0) > 0) {
      const forma = pag.forma_pagamento as keyof typeof porForma | null
      if (forma && forma in porForma) porForma[forma] += Number(pag.valor_pago)
      else porForma.sem_forma += Number(pag.valor_pago)
    }
  }

  const porMes: RelatorioPorMes[] = []

  let totMenRecebido = 0, totMenEsperado = 0, totMenPagos = 0, totMenTotal = 0
  let totDiaRecebido = 0, totDiaEsperado = 0, totDiaPagos = 0, totDiaTotal = 0, totDiaIsentos = 0

  // Player-level accumulation for pending report
  const playerMenPendente = new Map<string, { nome: string; valor: number }>()
  const playerDiaPendente = new Map<string, { nome: string; valor: number }>()

  for (const { mes, ano } of mesesTemporada) {
    const { mensalidade, diarista: valorDiarista } = getValores(mes, ano)
    const mesKey = `${ano}-${mes}`
    const label = `${MESES_PT[mes - 1]} ${ano}`

    // Mensalistas for this month
    let menRecebido = 0, menEsperado = 0, menPagos = 0, menTotal = 0
    for (const m of mensalistasAtivos) {
      if (!m.mesesAtivos.includes(mes)) continue
      menTotal++
      const pag = pagMenMap.get(`${m.jogador_id}-${mes}-${ano}`)
      const esperado = mensalidade
      const recebido = computeRecebidoMensalista(pag, esperado)
      menEsperado += esperado
      menRecebido += Math.min(recebido, esperado) // cap at expected
      if (pag?.pago) menPagos++

      const pendente = Math.max(0, esperado - recebido)
      if (pendente > 0) {
        const prev = playerMenPendente.get(m.jogador_id)
        playerMenPendente.set(m.jogador_id, { nome: m.nome, valor: (prev?.valor ?? 0) + pendente })
      }
    }

    // Diaristas for this month
    let diaRecebido = 0, diaEsperado = 0, diaPagos = 0, diaTotal = 0, diaIsentos = 0
    const partidasDoMes = partidasMes.get(mesKey) ?? []
    const mensalistasDoMes = mensalistasNoMes.get(`${mes}`) ?? new Set()

    for (const partida of partidasDoMes) {
      const jogadores = pjDiaristas.filter(pj => pj.partida_id === partida.id)
      for (const pj of jogadores) {
        if (mensalistasDoMes.has(pj.jogador_id)) continue // is mensalista, skip
        const pag = pagDiarMap.get(`${partida.id}:${pj.jogador_id}`)
        const isento = pag?.isento ?? pj.posicao_principal === 'Goleiro'
        if (isento) { diaIsentos++; continue }

        diaTotal++
        const recebido = Number(pag?.valor_pago ?? 0)
        diaEsperado += valorDiarista
        diaRecebido += Math.min(recebido, valorDiarista)
        if (pag?.pago) diaPagos++

        const pendente = Math.max(0, valorDiarista - recebido)
        if (pendente > 0) {
          const prev = playerDiaPendente.get(pj.jogador_id)
          playerDiaPendente.set(pj.jogador_id, { nome: pj.nome, valor: (prev?.valor ?? 0) + pendente })
        }
      }
    }

    porMes.push({
      mes, ano, label,
      mensalistasRecebido: menRecebido,
      mensalistasEsperado: menEsperado,
      diaristasRecebido: diaRecebido,
      diaristasEsperado: diaEsperado,
      totalRecebido: menRecebido + diaRecebido,
      totalEsperado: menEsperado + diaEsperado,
    })

    totMenRecebido += menRecebido
    totMenEsperado += menEsperado
    totMenPagos += menPagos
    totMenTotal += menTotal
    totDiaRecebido += diaRecebido
    totDiaEsperado += diaEsperado
    totDiaPagos += diaPagos
    totDiaTotal += diaTotal
    totDiaIsentos += diaIsentos
  }

  // Merge player pending lists
  const allPendentesMap = new Map<string, RelatorioJogadorPendente>()
  for (const [id, d] of playerMenPendente) {
    allPendentesMap.set(id, { jogador_id: id, nome: d.nome, pendenteMensalista: d.valor, pendenteDiarista: 0, total: d.valor })
  }
  for (const [id, d] of playerDiaPendente) {
    if (allPendentesMap.has(id)) {
      const prev = allPendentesMap.get(id)!
      prev.pendenteDiarista = d.valor
      prev.total += d.valor
    } else {
      allPendentesMap.set(id, { jogador_id: id, nome: d.nome, pendenteMensalista: 0, pendenteDiarista: d.valor, total: d.valor })
    }
  }
  const pendentes = Array.from(allPendentesMap.values()).sort((a, b) => b.total - a.total)

  const totalRecebido = totMenRecebido + totDiaRecebido
  const totalEsperado = totMenEsperado + totDiaEsperado

  const relatorio: RelatorioFinanceiro = {
    totalRecebido,
    totalEsperado,
    totalPendente: Math.max(0, totalEsperado - totalRecebido),
    taxaPagamento: totalEsperado > 0 ? Math.round((totalRecebido / totalEsperado) * 1000) / 10 : 0,
    mensalistas: {
      recebido: totMenRecebido,
      esperado: totMenEsperado,
      pendente: Math.max(0, totMenEsperado - totMenRecebido),
      nPagos: totMenPagos,
      nTotal: totMenTotal,
    },
    diaristas: {
      recebido: totDiaRecebido,
      esperado: totDiaEsperado,
      pendente: Math.max(0, totDiaEsperado - totDiaRecebido),
      nPagos: totDiaPagos,
      nTotal: totDiaTotal,
      nIsentos: totDiaIsentos,
    },
    porForma,
    porMes,
    pendentes,
  }

  return Response.json(relatorio)
}
