import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('enquetes')
    .select('*, enquete_opcoes(*), enquete_votos(count), enquete_tokens(*, jogadores(nome))')
    .order('criado_em', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { titulo, descricao, opcoes, mostrar_resultados, temporada_id, partida_id } = await request.json()

  if (!titulo || !opcoes?.length) {
    return Response.json({ error: 'titulo e opcoes são obrigatórios' }, { status: 400 })
  }

  // Create enquete
  const { data: enquete, error: eErr } = await supabaseAdmin
    .from('enquetes')
    .insert({ titulo, descricao, mostrar_resultados: !!mostrar_resultados, temporada_id: temporada_id || null, partida_id: partida_id || null })
    .select()
    .single()

  if (eErr || !enquete) return Response.json({ error: eErr?.message }, { status: 500 })

  // Insert options
  const opcoesData = (opcoes as string[]).map((texto, i) => ({ enquete_id: enquete.id, texto, ordem: i }))
  await supabaseAdmin.from('enquete_opcoes').insert(opcoesData)

  // Generate tokens for all active players
  const { data: jogadores } = await supabaseAdmin
    .from('jogadores')
    .select('id')
    .eq('ativo', true)

  if (jogadores?.length) {
    const tokens = jogadores.map(j => ({ enquete_id: enquete.id, jogador_id: j.id }))
    await supabaseAdmin.from('enquete_tokens').insert(tokens)
  }

  // Return full enquete with tokens for sharing
  const { data: full } = await supabaseAdmin
    .from('enquetes')
    .select('*, enquete_opcoes(*), enquete_tokens(*, jogadores(nome))')
    .eq('id', enquete.id)
    .single()

  return Response.json(full, { status: 201 })
}
