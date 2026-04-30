import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/apiAuth'
import type { NextRequest } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const { forbidden } = await requireAdmin()
  if (forbidden) return forbidden

  const { jogador_id } = await request.json()
  if (!jogador_id) return Response.json({ error: 'jogador_id obrigatório' }, { status: 400 })

  const { data: enquete } = await supabaseAdmin
    .from('enquetes')
    .select('id, ativa')
    .eq('id', id)
    .single()

  if (!enquete) return Response.json({ error: 'Enquete não encontrada' }, { status: 404 })
  if (!enquete.ativa) return Response.json({ error: 'Votação encerrada' }, { status: 409 })

  const { data, error } = await supabaseAdmin
    .from('enquete_tokens')
    .insert({ enquete_id: id, jogador_id })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
