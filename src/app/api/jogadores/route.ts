import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('jogadores')
    .select('*')
    .eq('ativo', true)
    .order('nome')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('jogadores')
    .insert({
      nome: body.nome,
      posicao_principal: body.posicao_principal,
      posicao_secundaria_1: body.posicao_secundaria_1 || null,
      posicao_secundaria_2: body.posicao_secundaria_2 || null,
      mensalista: body.mensalista ?? false,
      nivel: body.nivel ?? 3,
      telefone: body.telefone || null,
      aniversario: body.aniversario || null,
      observacoes: body.observacoes || null,
      ativo: true,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
