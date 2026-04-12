import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const temporadaId = searchParams.get('temporada_id')

  let query = supabase
    .from('partidas')
    .select(`
      *,
      partida_jogadores(count)
    `)
    .order('data', { ascending: false })

  if (temporadaId) {
    query = query.eq('temporada_id', temporadaId)
  }

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Resolve temporada_id: use provided or auto-assign active temporada
  let temporadaId: string | null = body.temporada_id ?? null
  if (!temporadaId) {
    const { data: ativa } = await supabase
      .from('temporadas')
      .select('id')
      .eq('ativa', true)
      .single()
    if (ativa) temporadaId = ativa.id
  }

  // Create the match
  const { data: partida, error: partidaError } = await supabase
    .from('partidas')
    .insert({
      data: body.data,
      local: body.local || null,
      observacoes: body.observacoes || null,
      status: 'agendada',
      numero_jogadores: body.numero_jogadores ?? null,
      nome_time_a: body.nome_time_a || 'Amarelo',
      nome_time_b: body.nome_time_b || 'Azul',
      temporada_id: temporadaId,
    })
    .select()
    .single()

  if (partidaError) return Response.json({ error: partidaError.message }, { status: 500 })

  // Auto-include mensalistas da temporada
  if (temporadaId) {
    const { data: mensalistas } = await supabase
      .from('temporada_mensalistas')
      .select('jogador_id')
      .eq('temporada_id', temporadaId)

    if (mensalistas && mensalistas.length > 0) {
      await supabase.from('partida_jogadores').insert(
        mensalistas.map(m => ({
          partida_id: partida.id,
          jogador_id: m.jogador_id,
          confirmado: true,
          adicionado_manualmente: false,
        }))
      )
    }
  }

  return Response.json(partida, { status: 201 })
}
