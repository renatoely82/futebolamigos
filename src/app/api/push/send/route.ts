import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import type { NextRequest } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  // ✅ Inicializa aqui — só executa em runtime, não no build
  const vapidEmail = process.env.VAPID_EMAIL!
  webpush.setVapidDetails(
    vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  // Auth check — only admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { titulo, corpo, url, jogador_ids } = await request.json()

  if (!titulo || !corpo) {
    return Response.json({ error: 'titulo e corpo são obrigatórios' }, { status: 400 })
  }

  let query = supabaseAdmin.from('push_subscriptions').select('subscription, jogador_id')
  if (jogador_ids?.length) {
    query = query.in('jogador_id', jogador_ids)
  }

  const { data: subscriptions, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!subscriptions?.length) return Response.json({ sent: 0 })

  const payload = JSON.stringify({ title: titulo, body: corpo, url: url || '/partidas' })

  const results = await Promise.allSettled(
    subscriptions.map(({ subscription }) =>
      webpush.sendNotification(subscription as webpush.PushSubscription, payload)
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return Response.json({ sent, failed })
}