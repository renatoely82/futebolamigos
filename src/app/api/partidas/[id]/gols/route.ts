import { createClient } from '@/lib/supabase-server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('gols')
    .select('*, jogador:jogadores(*)')
    .eq('partida_id', id)
    .order('quantidade', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// Body: { gols: [{ jogador_id: string, quantidade: number }] }
// Replaces all goals for this match atomically
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { gols } = await request.json() as { gols: { jogador_id: string; quantidade: number }[] }

  // Delete existing then insert new (upsert on unique constraint)
  const { error: delError } = await supabase
    .from('gols')
    .delete()
    .eq('partida_id', id)

  if (delError) return Response.json({ error: delError.message }, { status: 500 })

  if (gols.length === 0) return Response.json([])

  const rows = gols
    .filter(g => g.quantidade > 0)
    .map(g => ({ partida_id: id, jogador_id: g.jogador_id, quantidade: g.quantidade }))

  const { data, error } = await supabase
    .from('gols')
    .insert(rows)
    .select('*, jogador:jogadores(*)')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
