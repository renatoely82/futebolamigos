import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { origem_temporada_id } = await request.json()

  if (!origem_temporada_id) {
    return Response.json({ error: 'origem_temporada_id é obrigatório' }, { status: 400 })
  }

  // Fetch rules from origin season
  const { data: regrasOrigem, error: fetchError } = await supabase
    .from('regras')
    .select('categoria, numero, descricao, ativa')
    .eq('temporada_id', origem_temporada_id)
    .order('categoria', { ascending: true })
    .order('numero', { ascending: true })

  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 })
  if (!regrasOrigem || regrasOrigem.length === 0) {
    return Response.json({ error: 'Nenhuma regra encontrada na temporada de origem' }, { status: 404 })
  }

  const novasRegras = regrasOrigem.map(r => ({
    temporada_id: id,
    categoria: r.categoria,
    numero: r.numero,
    descricao: r.descricao,
    ativa: r.ativa,
  }))

  const { data, error: insertError } = await supabase
    .from('regras')
    .insert(novasRegras)
    .select()

  if (insertError) return Response.json({ error: insertError.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
