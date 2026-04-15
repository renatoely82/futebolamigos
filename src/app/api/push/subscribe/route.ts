import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { jogador_id, subscription } = await request.json()

  if (!jogador_id || !subscription?.endpoint) {
    return Response.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { jogador_id, subscription, atualizado_em: new Date().toISOString() },
      { onConflict: 'jogador_id' }
    )

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const { jogador_id } = await request.json()
  if (!jogador_id) return Response.json({ error: 'Dados inválidos' }, { status: 400 })

  await supabase.from('push_subscriptions').delete().eq('jogador_id', jogador_id)

  return Response.json({ success: true })
}
