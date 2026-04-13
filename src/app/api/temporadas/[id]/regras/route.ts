import { createClient } from '@/lib/supabase-server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('regras')
    .select('*')
    .eq('temporada_id', id)
    .order('categoria', { ascending: true })
    .order('numero', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { categoria, descricao } = await request.json()

  if (!categoria || !descricao?.trim()) {
    return Response.json({ error: 'categoria e descricao são obrigatórios' }, { status: 400 })
  }

  // Calculate next numero for this categoria
  const { data: existing } = await supabase
    .from('regras')
    .select('numero')
    .eq('temporada_id', id)
    .eq('categoria', categoria)
    .order('numero', { ascending: false })
    .limit(1)

  const numero = existing && existing.length > 0 ? existing[0].numero + 1 : 1

  const { data, error } = await supabase
    .from('regras')
    .insert({ temporada_id: id, categoria, descricao: descricao.trim(), numero })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
