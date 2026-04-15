import { createClient } from '@/lib/supabase-server'

// GET /api/temporadas/[id]/pagamentos-diaristas?mes=X&ano=Y
// Returns diarista payments for a season grouped by match, filtered by month.
// Goalkeepers (Goleiro) are included but marked as isento=true — they don't pay.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: temporada_id } = await params
  const supabase = await createClient()

  const url = new URL(request.url)
  const mes = url.searchParams.get('mes')
  const ano = url.searchParams.get('ano')

  // Build partidas query with optional month filter
  let partidasQuery = supabase
    .from('partidas')
    .select('id, data, local, status')
    .eq('temporada_id', temporada_id)
    .order('data', { ascending: true })

  if (mes && ano) {
    const mesNum = parseInt(mes)
    const anoNum = parseInt(ano)
    const dataInicio = `${anoNum}-${String(mesNum).padStart(2, '0')}-01`
    // Last day of month: first day of next month minus 1 day
    const proximoMes = mesNum === 12 ? 1 : mesNum + 1
    const proximoAno = mesNum === 12 ? anoNum + 1 : anoNum
    const dataFim = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-01`
    partidasQuery = partidasQuery.gte('data', dataInicio).lt('data', dataFim)
  }

  const { data: partidas, error: partError } = await partidasQuery

  if (partError) return Response.json({ error: partError.message }, { status: 500 })
  if (!partidas || partidas.length === 0) return Response.json([])

  const partidaIds = partidas.map(p => p.id)
  const mesNum = mes ? parseInt(mes) : null

  // Get all players across these matches (not just manually added)
  const { data: partida_jogadores, error: pjError } = await supabase
    .from('partida_jogadores')
    .select('partida_id, jogador_id, jogador:jogadores(id, nome, posicao_principal)')
    .in('partida_id', partidaIds)

  if (pjError) return Response.json({ error: pjError.message }, { status: 500 })

  // Get mensalistas for this season and determine who is active for the selected month
  const { data: mensalistas } = await supabase
    .from('temporada_mensalistas')
    .select('jogador_id, meses')
    .eq('temporada_id', temporada_id)

  const mensalistasNoMes = new Set(
    (mensalistas ?? [])
      .filter(m => mesNum === null || m.meses === null || m.meses.includes(mesNum))
      .map(m => m.jogador_id)
  )

  // Get all payment records for these matches
  const { data: pagamentos, error: pagError } = await supabase
    .from('pagamentos_diaristas')
    .select('*')
    .in('partida_id', partidaIds)

  if (pagError) return Response.json({ error: pagError.message }, { status: 500 })

  const pagamentosMap = new Map((pagamentos ?? []).map(p => [`${p.partida_id}:${p.jogador_id}`, p]))

  // Group by partida, include goalkeepers as isento, only include matches that have diaristas
  const result = partidas
    .map(partida => {
      const diaristas = (partida_jogadores ?? [])
        .filter(pj => {
          if (pj.partida_id !== partida.id) return false
          // Diarista = player in the match who is NOT a mensalista for this month (goalkeepers included, marked as isento)
          return !mensalistasNoMes.has(pj.jogador_id)
        })
        .map(pj => {
          const pagamento = pagamentosMap.get(`${partida.id}:${pj.jogador_id}`) ?? null
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
        .sort((a, b) => {
          const rankA = (a.pago || (a.valor_pago ?? 0) > 0) ? 1 : 0
          const rankB = (b.pago || (b.valor_pago ?? 0) > 0) ? 1 : 0
          if (rankA !== rankB) return rankA - rankB
          const nomeA = (a.jogador as { nome: string } | null)?.nome ?? ''
          const nomeB = (b.jogador as { nome: string } | null)?.nome ?? ''
          return nomeA.localeCompare(nomeB, 'pt-BR')
        })

      return { partida, diaristas }
    })
    .filter(item => item.diaristas.length > 0)

  return Response.json(result)
}
