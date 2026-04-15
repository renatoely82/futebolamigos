import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { token, opcao_id } = await request.json()

  if (!token || !opcao_id) {
    return Response.json({ error: 'token e opcao_id são obrigatórios' }, { status: 400 })
  }

  // Validate token
  const { data: tokenRow } = await supabase
    .from('enquete_tokens')
    .select('jogador_id, usado')
    .eq('enquete_id', id)
    .eq('token', token)
    .single()

  if (!tokenRow) return Response.json({ error: 'Token inválido' }, { status: 403 })
  if (tokenRow.usado) return Response.json({ error: 'Você já votou nesta enquete' }, { status: 409 })

  // Check enquete is active
  const { data: enquete } = await supabase
    .from('enquetes')
    .select('ativa')
    .eq('id', id)
    .single()

  if (!enquete?.ativa) return Response.json({ error: 'Enquete encerrada' }, { status: 403 })

  // Record vote
  const { error: voteErr } = await supabase
    .from('enquete_votos')
    .insert({ enquete_id: id, jogador_id: tokenRow.jogador_id, opcao_id })

  if (voteErr) return Response.json({ error: voteErr.message }, { status: 500 })

  // Mark token as used
  await supabase.from('enquete_tokens').update({ usado: true }).eq('enquete_id', id).eq('token', token)

  return Response.json({ success: true })
}
