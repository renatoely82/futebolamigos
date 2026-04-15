import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Params = { params: Promise<{ id: string }> }

// Public GET — requires valid token in query string
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get('token')

  if (!token) return Response.json({ error: 'Token obrigatório' }, { status: 400 })

  // Validate token
  const { data: tokenRow } = await supabaseAdmin
    .from('enquete_tokens')
    .select('jogador_id, usado, jogadores(nome)')
    .eq('enquete_id', id)
    .eq('token', token)
    .single()

  if (!tokenRow) return Response.json({ error: 'Token inválido' }, { status: 404 })

  const { data: enquete } = await supabaseAdmin
    .from('enquetes')
    .select('*, enquete_opcoes(*)')
    .eq('id', id)
    .single()

  if (!enquete) return Response.json({ error: 'Enquete não encontrada' }, { status: 404 })

  return Response.json({ enquete, tokenRow })
}

// Admin GET without token — returns full data with tokens
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { error } = await supabaseAdmin
    .from('enquetes')
    .update({ ativa: body.ativa, mostrar_resultados: body.mostrar_resultados })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  await supabaseAdmin.from('enquetes').delete().eq('id', id)
  return Response.json({ success: true })
}
