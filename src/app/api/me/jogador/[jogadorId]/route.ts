import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { TeamSplit } from '@/lib/supabase'
import type { JogadorPartidaEntry } from '@/app/api/temporadas/[id]/jogadores/[jogadorId]/route'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/me/jogador/[jogadorId]
// Devolve dados do jogador + histórico na temporada activa para o portal do jogador.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jogadorId: string }> }
) {
  const { jogadorId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })

  const [jogadorRes, temporadaRes] = await Promise.all([
    supabaseAdmin.from('jogadores').select('*').eq('id', jogadorId).single(),
    supabaseAdmin.from('temporadas').select('id').eq('ativa', true).single(),
  ])

  if (!jogadorRes.data) return Response.json({ error: 'Jogador não encontrado' }, { status: 404 })
  if (!temporadaRes.data) return Response.json({ jogador: jogadorRes.data, partidas: [], totalPartidasTemporada: 0 })

  const temporadaId = temporadaRes.data.id

  const { data: partidas } = await supabaseAdmin
    .from('partidas')
    .select('id, data, local, placar_time_a, placar_time_b, nome_time_a, nome_time_b, times_escolhidos')
    .eq('temporada_id', temporadaId)
    .eq('status', 'realizada')
    .not('placar_time_a', 'is', null)
    .not('placar_time_b', 'is', null)
    .order('data', { ascending: false })

  if (!partidas || partidas.length === 0) {
    return Response.json({ jogador: jogadorRes.data, partidas: [], totalPartidasTemporada: 0 })
  }

  const partidaIds = partidas.map(p => p.id)

  const [pjsRes, golsRes, subsRes] = await Promise.all([
    supabaseAdmin.from('partida_jogadores').select('partida_id, jogador_id').in('partida_id', partidaIds).eq('jogador_id', jogadorId),
    supabaseAdmin.from('gols').select('partida_id, jogador_id, quantidade, gol_contra').in('partida_id', partidaIds).eq('jogador_id', jogadorId),
    supabaseAdmin.from('substituicoes').select('partida_id, jogador_ausente_id, jogador_substituto_id').in('partida_id', partidaIds),
  ])

  const participacoes = new Set((pjsRes.data ?? []).map(pj => pj.partida_id))
  const gols = golsRes.data ?? []
  const subs = subsRes.data ?? []

  const golsMap = new Map<string, number>()
  const golsContraMap = new Map<string, number>()
  for (const g of gols) {
    if (g.gol_contra) golsContraMap.set(g.partida_id, (golsContraMap.get(g.partida_id) ?? 0) + g.quantidade)
    else golsMap.set(g.partida_id, (golsMap.get(g.partida_id) ?? 0) + g.quantidade)
  }

  // Substituições por partida: ausente → substituto
  const subsAusenteMap = new Map<string, Map<string, string>>() // partida_id → ausente_id → substituto_id
  for (const s of subs) {
    if (!subsAusenteMap.has(s.partida_id)) subsAusenteMap.set(s.partida_id, new Map())
    subsAusenteMap.get(s.partida_id)!.set(s.jogador_ausente_id, s.jogador_substituto_id)
  }

  const result: JogadorPartidaEntry[] = []

  for (const p of partidas) {
    if (!participacoes.has(p.id)) continue

    const tc = p.times_escolhidos as TeamSplit | null
    const pA = p.placar_time_a as number
    const pB = p.placar_time_b as number
    const subsPorPartida = subsAusenteMap.get(p.id)

    let resultado: 'V' | 'E' | 'D' | null = null
    if (tc) {
      // Verifica se jogador está no time (considerando substituições)
      let inTimeA = tc.time_a?.includes(jogadorId) ?? false
      let inTimeB = tc.time_b?.includes(jogadorId) ?? false

      // Se é substituto, herda o time do ausente
      if (!inTimeA && !inTimeB && subsPorPartida) {
        for (const [ausenteId, substitutoId] of subsPorPartida) {
          if (substitutoId === jogadorId) {
            inTimeA = tc.time_a?.includes(ausenteId) ?? false
            inTimeB = tc.time_b?.includes(ausenteId) ?? false
            break
          }
        }
      }

      // Se é ausente, não conta resultado
      const isAusente = subsPorPartida?.has(jogadorId) ?? false
      if (!isAusente && (inTimeA || inTimeB)) {
        if (pA === pB) resultado = 'E'
        else resultado = (inTimeA && pA > pB) || (inTimeB && pB > pA) ? 'V' : 'D'
      }
    }

    result.push({
      partida_id: p.id,
      data: p.data,
      local: p.local,
      nome_time_a: p.nome_time_a,
      nome_time_b: p.nome_time_b,
      placar_time_a: p.placar_time_a,
      placar_time_b: p.placar_time_b,
      gols_marcados: golsMap.get(p.id) ?? 0,
      gols_contra: golsContraMap.get(p.id) ?? 0,
      resultado,
    })
  }

  return Response.json({
    jogador: jogadorRes.data,
    partidas: result,
    totalPartidasTemporada: partidas.length,
  })
}
