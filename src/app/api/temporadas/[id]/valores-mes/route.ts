import { createClient } from '@/lib/supabase-server'

// GET /api/temporadas/[id]/valores-mes?mes=X&ano=X
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes')
  const ano = searchParams.get('ano')

  if (!mes || !ano) {
    return Response.json({ error: 'mes e ano são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('temporada_valores_mes')
    .select('*')
    .eq('temporada_id', id)
    .eq('mes', Number(mes))
    .eq('ano', Number(ano))
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? null)
}

// PATCH /api/temporadas/[id]/valores-mes?mes=X&ano=X
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes')
  const ano = searchParams.get('ano')

  if (!mes || !ano) {
    return Response.json({ error: 'mes e ano são obrigatórios' }, { status: 400 })
  }

  const body = await request.json()
  const updateData: Record<string, unknown> = { atualizado_em: new Date().toISOString() }
  if ('valor_mensalidade' in body) updateData.valor_mensalidade = body.valor_mensalidade ?? null
  if ('valor_diarista' in body) updateData.valor_diarista = body.valor_diarista ?? null

  const { data, error } = await supabase
    .from('temporada_valores_mes')
    .upsert(
      {
        temporada_id: id,
        mes: Number(mes),
        ano: Number(ano),
        ...updateData,
      },
      { onConflict: 'temporada_id,mes,ano' }
    )
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
