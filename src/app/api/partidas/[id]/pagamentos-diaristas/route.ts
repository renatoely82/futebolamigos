import { createClient } from '@/lib/supabase-server'

// GET /api/partidas/[id]/pagamentos-diaristas
// Returns all manually-added players for the match with their payment status
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: partida_id } = await params
  const supabase = await createClient()

  // Get partida info to determine the month and season
  const { data: partida, error: partError } = await supabase
    .from('partidas')
    .select('data, temporada_id')
    .eq('id', partida_id)
    .single()

  if (partError) return Response.json({ error: partError.message }, { status: 500 })

  // Get all players for this match (not just manually added)
  const { data: partida_jogadores, error: pjError } = await supabase
    .from('partida_jogadores')
    .select('jogador_id, jogador:jogadores(id, nome, posicao_principal, nivel)')
    .eq('partida_id', partida_id)

  if (pjError) return Response.json({ error: pjError.message }, { status: 500 })
  if (!partida_jogadores || partida_jogadores.length === 0) return Response.json([])

  // Determine which players are mensalistas for this match's month
  let mensalistasNoMes = new Set<string>()
  if (partida?.temporada_id) {
    const mesPartida = new Date(partida.data).getUTCMonth() + 1
    const { data: mensalistas } = await supabase
      .from('temporada_mensalistas')
      .select('jogador_id, meses')
      .eq('temporada_id', partida.temporada_id)

    mensalistasNoMes = new Set(
      (mensalistas ?? [])
        .filter(m => m.meses === null || m.meses.includes(mesPartida))
        .map(m => m.jogador_id)
    )
  }

  const jogadorIds = partida_jogadores.map(pj => pj.jogador_id)

  // Get existing payment records for these players in this match
  const { data: pagamentos, error: pagError } = await supabase
    .from('pagamentos_diaristas')
    .select('*')
    .eq('partida_id', partida_id)
    .in('jogador_id', jogadorIds)

  if (pagError) return Response.json({ error: pagError.message }, { status: 500 })

  const pagamentosMap = new Map((pagamentos ?? []).map(p => [p.jogador_id, p]))

  // Diaristas = players in the match who are NOT mensalistas for this month (goalkeepers included, marked as isento)
  const diaristasJogadores = partida_jogadores.filter(pj => !mensalistasNoMes.has(pj.jogador_id))

  const result = diaristasJogadores.map(pj => {
    const pagamento = pagamentosMap.get(pj.jogador_id) ?? null
    const jogador = pj.jogador as { posicao_principal?: string } | null
    const isGoleiro = jogador?.posicao_principal === 'Goleiro'
    return {
      jogador_id: pj.jogador_id,
      jogador: pj.jogador,
      pagamento_id: pagamento?.id ?? null,
      pago: pagamento?.pago ?? false,
      valor_pago: pagamento?.valor_pago ?? null,
      forma_pagamento: pagamento?.forma_pagamento ?? null,
      data_pagamento: pagamento?.data_pagamento ?? null,
      observacoes: pagamento?.observacoes ?? null,
      isento: pagamento ? (pagamento.isento ?? isGoleiro) : isGoleiro,
    }
  })

  return Response.json(result)
}

// POST /api/partidas/[id]/pagamentos-diaristas
// Upserts a payment record for a diarista in this match
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: partida_id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const { jogador_id, pago, valor_pago, forma_pagamento, data_pagamento, observacoes, isento } = body

  if (!jogador_id) return Response.json({ error: 'jogador_id é obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('pagamentos_diaristas')
    .upsert(
      {
        partida_id,
        jogador_id,
        pago: pago ?? false,
        valor_pago: valor_pago ?? null,
        forma_pagamento: forma_pagamento ?? null,
        data_pagamento: data_pagamento ?? null,
        observacoes: observacoes ?? null,
        isento: isento ?? false,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'partida_id,jogador_id' }
    )
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
