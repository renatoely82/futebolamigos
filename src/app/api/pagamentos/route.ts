import { createClient } from '@/lib/supabase-server'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mensalistas = (mensalistasRaw ?? []).filter((m: any) => m.meses === null || m.meses.includes(mesNum))

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (mensalistas ?? []).map((m: any) => {
    const pagamento = pagamentosMap.get(m.jogador_id)
    const jogador = Array.isArray(m.jogador) ? (m.jogador[0] ?? null) : m.jogador
    return {
      jogador_id: m.jogador_id,
      jogador,
      pagamento_id: pagamento?.id ?? null,
      pago: pagamento?.pago ?? false,
      data_pagamento: pagamento?.data_pagamento ?? null,
      observacoes: pagamento?.observacoes ?? null,
    }
  })

  // Sort by player name
  result.sort((a, b) => {
    const nomeA = (a.jogador as { nome: string } | null)?.nome ?? ''
    const nomeB = (b.jogador as { nome: string } | null)?.nome ?? ''
    return nomeA.localeCompare(nomeB, 'pt-BR')
  })

  return Response.json(result)
}

// POST /api/pagamentos — toggle/set payment
export async function POST(request: Request) {
  const supabase = await createClient()
  const { temporada_id, jogador_id, mes, ano, pago, data_pagamento, observacoes } = await request.json()

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
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'temporada_id,jogador_id,mes,ano' }
    )
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
