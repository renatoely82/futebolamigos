import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: partida } = await supabaseAdmin
    .from('partidas')
    .select('votacao_enquete_id')
    .eq('id', id)
    .single()

  if (!partida?.votacao_enquete_id) {
    return Response.json({ status: 'sem_votacao' })
  }

  const enqueteId = partida.votacao_enquete_id

  const [{ data: enquete }, { data: opcoes }, { data: votos }, { data: tokens }] = await Promise.all([
    supabaseAdmin.from('enquetes').select('id, ativa').eq('id', enqueteId).single(),
    supabaseAdmin.from('enquete_opcoes').select('id, texto, ordem').eq('enquete_id', enqueteId).order('ordem'),
    supabaseAdmin.from('enquete_votos').select('opcao_id').eq('enquete_id', enqueteId),
    supabaseAdmin.from('enquete_tokens').select('jogador_id, token, usado, jogadores(nome)').eq('enquete_id', enqueteId),
  ])

  if (!enquete) return Response.json({ error: 'Votação não encontrada' }, { status: 404 })

  // Build vote counts per option
  const votesPerOpcao: Record<string, number> = {}
  for (const v of votos ?? []) {
    votesPerOpcao[v.opcao_id] = (votesPerOpcao[v.opcao_id] ?? 0) + 1
  }

  // Map opcao order (0-indexed) to proposta_numero (1-indexed)
  const propostas_com_votos = (opcoes ?? []).map((op, i) => ({
    proposta_numero: (i + 1) as 1 | 2 | 3,
    opcao_id: op.id,
    votos: votesPerOpcao[op.id] ?? 0,
  }))

  return Response.json({
    status: 'com_votacao',
    enquete_id: enqueteId,
    ativa: enquete.ativa,
    propostas_com_votos,
    tokens: tokens ?? [],
  })
}

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  // Check no active voting exists
  const { data: partida } = await supabaseAdmin
    .from('partidas')
    .select('data, votacao_enquete_id')
    .eq('id', id)
    .single()

  if (!partida) return Response.json({ error: 'Partida não encontrada' }, { status: 404 })
  if (partida.votacao_enquete_id) {
    return Response.json({ error: 'Já existe uma votação aberta para esta partida' }, { status: 409 })
  }

  // Check that 3 proposals exist
  const { data: propostas } = await supabaseAdmin
    .from('propostas_times')
    .select('id, proposta_numero')
    .eq('partida_id', id)

  if (!propostas || propostas.length < 3) {
    return Response.json({ error: 'Gere as 3 propostas de times antes de abrir a votação' }, { status: 400 })
  }

  // Create enquete
  const dataFormatada = format(parseISO(partida.data), "d 'de' MMMM", { locale: ptBR })
  const { data: enquete, error: eErr } = await supabaseAdmin
    .from('enquetes')
    .insert({
      titulo: `Times — ${dataFormatada}`,
      descricao: 'Vote na proposta de times para a partida.',
      mostrar_resultados: false,
      partida_id: id,
    })
    .select()
    .single()

  if (eErr || !enquete) return Response.json({ error: eErr?.message }, { status: 500 })

  // Insert 3 options (one per proposal)
  const opcoesData = [
    { enquete_id: enquete.id, texto: 'Proposta 1', ordem: 0 },
    { enquete_id: enquete.id, texto: 'Proposta 2', ordem: 1 },
    { enquete_id: enquete.id, texto: 'Proposta 3', ordem: 2 },
  ]
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

  // Link enquete to partida
  await supabaseAdmin
    .from('partidas')
    .update({ votacao_enquete_id: enquete.id })
    .eq('id', id)

  // Return full data for sharing
  const { data: full } = await supabaseAdmin
    .from('enquetes')
    .select('*, enquete_opcoes(*), enquete_tokens(*, jogadores(nome))')
    .eq('id', enquete.id)
    .single()

  return Response.json(full, { status: 201 })
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: partida } = await supabaseAdmin
    .from('partidas')
    .select('votacao_enquete_id')
    .eq('id', id)
    .single()

  if (!partida?.votacao_enquete_id) {
    return Response.json({ error: 'Nenhuma votação aberta' }, { status: 404 })
  }

  await supabaseAdmin
    .from('enquetes')
    .update({ ativa: false })
    .eq('id', partida.votacao_enquete_id)

  return Response.json({ success: true })
}
