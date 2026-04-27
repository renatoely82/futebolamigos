import { createClient } from '@/lib/supabase-server'

// GET /api/despesas?temporada_id=...
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const temporada_id = searchParams.get('temporada_id')

  if (!temporada_id) return Response.json({ error: 'temporada_id obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .eq('temporada_id', temporada_id)
    .order('data', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

// POST /api/despesas
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || (user.app_metadata as Record<string, string>)?.role !== 'admin') {
    return Response.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json()
  const { temporada_id, data, descricao, categoria, valor, forma_pagamento, observacoes } = body

  if (!temporada_id || !data || !descricao || !valor) {
    return Response.json({ error: 'temporada_id, data, descricao e valor são obrigatórios' }, { status: 400 })
  }

  const { data: despesa, error } = await supabase
    .from('despesas')
    .insert({
      temporada_id,
      data,
      descricao,
      categoria: categoria ?? 'outros',
      valor: Number(valor),
      forma_pagamento: forma_pagamento ?? null,
      observacoes: observacoes ?? null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(despesa, { status: 201 })
}
