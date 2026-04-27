import { createClient } from '@/lib/supabase-server'

// DELETE /api/despesas/[id]
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || (user.app_metadata as Record<string, string>)?.role !== 'admin') {
    return Response.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const { error } = await supabase.from('despesas').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
