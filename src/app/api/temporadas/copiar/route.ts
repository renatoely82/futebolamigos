import { createClient } from '@/lib/supabase-server'

function mesesDaTemporada(dataInicio: string, dataFim: string): number[] | null {
  const start = new Date(dataInicio)
  const end = new Date(dataFim)
  const months: number[] = []

  const cur = new Date(start.getFullYear(), start.getUTCMonth(), 1)
  const endMonth = new Date(end.getFullYear(), end.getUTCMonth(), 1)

  while (cur <= endMonth) {
    months.push(cur.getMonth() + 1)
    cur.setMonth(cur.getMonth() + 1)
  }

  return months.length === 12 ? null : months
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { origem_temporada_id, data_inicio, data_fim } = await request.json()

  if (!origem_temporada_id || !data_inicio || !data_fim) {
    return Response.json({ error: 'origem_temporada_id, data_inicio e data_fim são obrigatórios' }, { status: 400 })
  }

  // 1. Busca a temporada origem
  const { data: origem, error: origemError } = await supabase
    .from('temporadas')
    .select('nome, data_fim')
    .eq('id', origem_temporada_id)
    .single()

  if (origemError || !origem) {
    return Response.json({ error: 'Temporada de origem não encontrada' }, { status: 404 })
  }

  // 2. Cria nova temporada com datas informadas e ativa = false
  const { data: novaTemporada, error: insertError } = await supabase
    .from('temporadas')
    .insert({
      nome: origem.nome,
      data_inicio,
      data_fim,
      ativa: false,
    })
    .select()
    .single()

  if (insertError || !novaTemporada) {
    return Response.json({ error: insertError?.message ?? 'Erro ao criar temporada' }, { status: 500 })
  }

  // 3. Copia regras da temporada origem
  const { data: regras } = await supabase
    .from('regras')
    .select('categoria, numero, descricao, ativa')
    .eq('temporada_id', origem_temporada_id)
    .order('categoria', { ascending: true })
    .order('numero', { ascending: true })

  if (regras && regras.length > 0) {
    await supabase.from('regras').insert(
      regras.map(r => ({
        temporada_id: novaTemporada.id,
        categoria: r.categoria,
        numero: r.numero,
        descricao: r.descricao,
        ativa: r.ativa,
      }))
    )
  }

  // 4. Copia mensalistas ativos no último mês da temporada origem,
  //    ajustando meses conforme o período da nova temporada
  const ultimoMes = new Date(origem.data_fim).getUTCMonth() + 1

  const { data: mensalistas } = await supabase
    .from('temporada_mensalistas')
    .select('jogador_id')
    .eq('temporada_id', origem_temporada_id)
    .or(`meses.is.null,meses.cs.{${ultimoMes}}`)

  if (mensalistas && mensalistas.length > 0) {
    const meses = mesesDaTemporada(data_inicio, data_fim)
    await supabase.from('temporada_mensalistas').insert(
      mensalistas.map(m => ({
        temporada_id: novaTemporada.id,
        jogador_id: m.jogador_id,
        meses,
      }))
    )
  }

  // 5. Copia diretoria da temporada origem
  const { data: diretoria } = await supabase
    .from('temporada_diretoria')
    .select('jogador_id')
    .eq('temporada_id', origem_temporada_id)

  if (diretoria && diretoria.length > 0) {
    await supabase.from('temporada_diretoria').insert(
      diretoria.map(d => ({
        temporada_id: novaTemporada.id,
        jogador_id: d.jogador_id,
      }))
    )
  }

  return Response.json({ id: novaTemporada.id }, { status: 201 })
}
