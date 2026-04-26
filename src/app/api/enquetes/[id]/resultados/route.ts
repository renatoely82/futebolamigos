import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { singleJoin } from '@/lib/supabase'
import type { NextRequest } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: opcoes } = await supabaseAdmin
    .from('enquete_opcoes')
    .select('id, texto')
    .eq('enquete_id', id)
    .order('ordem')

  const { data: votos } = await supabaseAdmin
    .from('enquete_votos')
    .select('opcao_id, jogadores(nome)')
    .eq('enquete_id', id)

  const { data: tokens } = await supabaseAdmin
    .from('enquete_tokens')
    .select('jogadores(nome), usado')
    .eq('enquete_id', id)

  const totalInscritos = tokens?.length ?? 0
  const totalVotos = votos?.length ?? 0

  const contagem = (opcoes ?? []).map(op => ({
    ...op,
    votos: (votos ?? []).filter(v => v.opcao_id === op.id).length,
    votantes: (votos ?? [])
      .filter(v => v.opcao_id === op.id)
      .map(v => singleJoin<{ nome: string }>(v.jogadores)?.nome ?? 'Desconhecido'),
  }))

  return Response.json({ contagem, totalVotos, totalInscritos })
}
