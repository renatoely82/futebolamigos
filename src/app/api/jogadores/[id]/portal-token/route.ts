import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Params = { params: Promise<{ id: string }> }

// POST /api/jogadores/[id]/portal-token — regenera o token do portal
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('jogadores')
    .update({ portal_token: crypto.randomUUID() })
    .eq('id', id)
    .select('portal_token')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ portal_token: data.portal_token })
}
