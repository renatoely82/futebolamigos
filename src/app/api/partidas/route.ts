import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('partidas')
    .select(`
      *,
      partida_jogadores(count)
    `)
    .order('data', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Create the match
  const { data: partida, error: partidaError } = await supabase
    .from('partidas')
    .insert({
      data: body.data,
      local: body.local || null,
      observacoes: body.observacoes || null,
      status: 'agendada',
    })
    .select()
    .single()

  if (partidaError) return Response.json({ error: partidaError.message }, { status: 500 })

  // Auto-include mensalistas
  const { data: mensalistas } = await supabase
    .from('jogadores')
    .select('id')
    .eq('mensalista', true)
    .eq('ativo', true)

  if (mensalistas && mensalistas.length > 0) {
    await supabase.from('partida_jogadores').insert(
      mensalistas.map(j => ({
        partida_id: partida.id,
        jogador_id: j.id,
        confirmado: true,
        adicionado_manualmente: false,
      }))
    )
  }

  return Response.json(partida, { status: 201 })
}
