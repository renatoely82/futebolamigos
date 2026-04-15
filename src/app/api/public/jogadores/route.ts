import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('jogadores')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
