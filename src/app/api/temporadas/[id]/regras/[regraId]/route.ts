import { createClient } from '@/lib/supabase-server'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; regraId: string }> }) {
  const supabase = await createClient()
  const { id, regraId } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = { atualizado_em: new Date().toISOString() }
  if (body.descricao !== undefined) updates.descricao = body.descricao.trim()
  if (body.categoria !== undefined) updates.categoria = body.categoria
  if (body.numero !== undefined) updates.numero = body.numero
  if (body.ativa !== undefined) updates.ativa = body.ativa

  const { data, error } = await supabase
    .from('regras')
    .update(updates)
    .eq('id', regraId)
    .eq('temporada_id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; regraId: string }> }) {
  const supabase = await createClient()
  const { id, regraId } = await params

  const { error } = await supabase
    .from('regras')
    .delete()
    .eq('id', regraId)
    .eq('temporada_id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
