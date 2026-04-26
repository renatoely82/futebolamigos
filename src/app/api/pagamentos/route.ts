import { createClient } from '@/lib/supabase-server'
import { singleJoin } from '@/lib/supabase'

// GET /api/pagamentos?temporada_id=...&mes=...&ano=...
// Returns all mensalistas for a season with their payment status for the given month/year
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const temporada_id = searchParams.get('temporada_id')
  const mes = searchParams.get('mes')
  const ano = searchParams.get('ano')

  if (!temporada_id) {
    return Response.json({ error: 'temporada_id é obrigatório' }, { status: 400 })
  }

  // If no mes/ano, return all raw payment records for the season
  if (!mes || !ano) {
    const { data, error } = await supabase
      .from('pagamentos_mensalistas')
      .select('jogador_id, mes, ano, pago')
      .eq('temporada_id', temporada_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data ?? [])
  }

  // Get all mensalistas for this season
  const { data: mensalistasRaw, error: mError } = await supabase
    .from('temporada_mensalistas')
    .select('jogador_id, meses, jogador:jogadores(id, nome)')
    .eq('temporada_id', temporada_id)
    .order('criado_em', { ascending: true })

  if (mError) return Response.json({ error: mError.message }, { status: 500 })

  // Filter only mensalistas active in this month
  const mesNum = Number(mes)
  const mensalistas = (mensalistasRaw ?? []).filter((m) => m.meses === null || (m.meses as number[]).includes(mesNum))

  // Get existing payment records for this season/month/year
  const { data: pagamentos, error: pError } = await supabase
    .from('pagamentos_mensalistas')
    .select('*')
    .eq('temporada_id', temporada_id)
    .eq('mes', Number(mes))
    .eq('ano', Number(ano))

  if (pError) return Response.json({ error: pError.message }, { status: 500 })

  const pagamentosMap = new Map(pagamentos?.map(p => [p.jogador_id, p]) ?? [])

  // Merge: for each mensalista, attach payment status
  const result = (mensalistas ?? []).map((m) => {
    const pagamento = pagamentosMap.get(m.jogador_id)
    const jogador = singleJoin<{ id: string; nome: string }>(m.jogador)
    return {
      jogador_id: m.jogador_id,
      jogador,
      pagamento_id: pagamento?.id ?? null,
      pago: pagamento?.pago ?? false,
      data_pagamento: pagamento?.data_pagamento ?? null,
      observacoes: pagamento?.observacoes ?? null,
      valor_pago: pagamento?.valor_pago ?? null,
      credito: pagamento?.credito ?? null,
      forma_pagamento: pagamento?.forma_pagamento ?? null,
    }
  })

  // Sort: pending/partial first, paid last; within same status sort by name
  function statusRank(entry: typeof result[number]): number {
    if (entry.pago) return 2
    if ((entry.valor_pago ?? 0) > 0 || (entry.credito ?? 0) > 0) return 1
    return 0
  }
  result.sort((a, b) => {
    const rankDiff = statusRank(a) - statusRank(b)
    if (rankDiff !== 0) return rankDiff
    const nomeA = singleJoin<{ nome: string }>(a.jogador)?.nome ?? ''
    const nomeB = singleJoin<{ nome: string }>(b.jogador)?.nome ?? ''
    return nomeA.localeCompare(nomeB, 'pt-BR')
  })

  return Response.json(result)
}

// POST /api/pagamentos — toggle/set payment
export async function POST(request: Request) {
  const supabase = await createClient()
  const { temporada_id, jogador_id, mes, ano, pago, data_pagamento, observacoes, valor_pago, credito, forma_pagamento } = await request.json()

  if (!temporada_id || !jogador_id || !mes || !ano) {
    return Response.json({ error: 'temporada_id, jogador_id, mes e ano são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('pagamentos_mensalistas')
    .upsert(
      {
        temporada_id,
        jogador_id,
        mes: Number(mes),
        ano: Number(ano),
        pago: pago ?? false,
        data_pagamento: data_pagamento ?? null,
        observacoes: observacoes ?? null,
        valor_pago: valor_pago ?? null,
        credito: credito ?? null,
        forma_pagamento: forma_pagamento ?? null,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'temporada_id,jogador_id,mes,ano' }
    )
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
