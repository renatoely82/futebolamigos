import { createClient } from '@/lib/supabase-server'

// PUT /api/pagamentos/[id] — update a specific payment record
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { pago, data_pagamento, observacoes, valor_pago, forma_pagamento } = await request.json()

  const { data, error } = await supabase
    .from('pagamentos_mensalistas')
    .update({
      pago,
      data_pagamento: data_pagamento ?? null,
      observacoes: observacoes ?? null,
      valor_pago: valor_pago ?? null,
      forma_pagamento: forma_pagamento ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
