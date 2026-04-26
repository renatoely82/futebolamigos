import { createClient } from '@/lib/supabase-server'

export interface ConfrontoEntry {
  time_a: string
  time_b: string
  jogos: number
  vitorias_a: number
  vitorias_b: number
  empates: number
  gols_a: number
  gols_b: number
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const dataInicio = searchParams.get('data_inicio')
  const dataFim = searchParams.get('data_fim')

  const supabase = await createClient()

  let query = supabase
    .from('partidas')
    .select('nome_time_a, nome_time_b, placar_time_a, placar_time_b')
    .eq('temporada_id', id)
    .eq('status', 'realizada')
    .not('placar_time_a', 'is', null)
    .not('placar_time_b', 'is', null)

  if (dataInicio) query = query.gte('data', dataInicio)
  if (dataFim) query = query.lte('data', dataFim)

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return Response.json([])

  // Aggregate by normalized team pair (alphabetical order)
  const map = new Map<string, ConfrontoEntry>()

  for (const p of data) {
    const nA = p.nome_time_a ?? 'Time A'
    const nB = p.nome_time_b ?? 'Time B'
    const pA = p.placar_time_a as number
    const pB = p.placar_time_b as number

    // Normalize: always store the pair with alphabetically smaller name first
    const [first, second, goalsFirst, goalsSecond] =
      nA.localeCompare(nB, 'pt-BR') <= 0
        ? [nA, nB, pA, pB]
        : [nB, nA, pB, pA]

    const key = `${first}||${second}`
    const entry = map.get(key) ?? {
      time_a: first,
      time_b: second,
      jogos: 0,
      vitorias_a: 0,
      vitorias_b: 0,
      empates: 0,
      gols_a: 0,
      gols_b: 0,
    }

    entry.jogos++
    entry.gols_a += goalsFirst
    entry.gols_b += goalsSecond

    if (goalsFirst > goalsSecond) entry.vitorias_a++
    else if (goalsSecond > goalsFirst) entry.vitorias_b++
    else entry.empates++

    map.set(key, entry)
  }

  // Sort by number of games desc, then alphabetically
  const result = Array.from(map.values()).sort((a, b) =>
    b.jogos - a.jogos || a.time_a.localeCompare(b.time_a, 'pt-BR')
  )

  return Response.json(result)
}
