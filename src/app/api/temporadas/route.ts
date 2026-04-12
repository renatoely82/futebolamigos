import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('temporadas')
    .select('*')
    .order('data_inicio', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  if (body.ativa) {
    await supabase.from('temporadas').update({ ativa: false }).eq('ativa', true)
  }

  const { data, error } = await supabase
    .from('temporadas')
    .insert({
      nome: body.nome,
      data_inicio: body.data_inicio,
      data_fim: body.data_fim,
      ativa: body.ativa ?? false,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
