import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Jogador, Posicao } from '@/lib/supabase'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: propostas, error } = await supabaseAdmin
    .from('propostas_times')
    .select('id, proposta_numero, time_a, time_b, selecionada')
    .eq('partida_id', id)
    .order('proposta_numero')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!propostas?.length) return Response.json([])

  // Collect all player IDs
  const allIds = [...new Set(propostas.flatMap(p => [...p.time_a, ...p.time_b]))]

  const [{ data: jogadores }, { data: convocacoes }] = await Promise.all([
    supabaseAdmin.from('jogadores').select('*').in('id', allIds),
    supabaseAdmin
      .from('partida_jogadores')
      .select('jogador_id, posicao_convocacao')
      .eq('partida_id', id),
  ])

  const jogadoresMap = new Map((jogadores ?? []).map((j: Jogador) => [j.id, j]))
  const convocacaoMap = new Map(
    (convocacoes ?? []).map((c: { jogador_id: string; posicao_convocacao: Posicao | null }) => [
      c.jogador_id,
      c.posicao_convocacao,
    ])
  )

  function resolvePlayer(pid: string): Jogador | undefined {
    const j = jogadoresMap.get(pid)
    if (!j) return undefined
    const override = convocacaoMap.get(pid)
    return override ? { ...j, posicao_principal: override } : j
  }

  const result = propostas.map(p => ({
    id: p.id,
    proposta_numero: p.proposta_numero,
    selecionada: p.selecionada,
    time_a: p.time_a.map(resolvePlayer).filter(Boolean) as Jogador[],
    time_b: p.time_b.map(resolvePlayer).filter(Boolean) as Jogador[],
  }))

  return Response.json(result)
}
