import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { TeamSplit, ClassificacaoEntry } from '@/lib/supabase'
import type { ConfrontoEntry } from '@/app/api/temporadas/[id]/confrontos/route'
import { getPortalData } from '@/lib/get-portal-data'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Params = { params: Promise<{ id: string }> }

export type PortalJogadorResumo = { id: string; nome: string; posicao: string }

export type PortalPartida = {
  id: string
  data: string
  local: string | null
  status: string
  nome_time_a: string
  nome_time_b: string
  placar_time_a: number | null
  placar_time_b: number | null
  times_escolhidos: TeamSplit | null
  escalacao: { time_a: PortalJogadorResumo[]; time_b: PortalJogadorResumo[] } | null
}

export type PortalPagamento = {
  tipo: 'mensalista' | 'diarista'
  descricao: string
  pago: boolean
  valor_pago: number | null
}

export type PortalVotacao = {
  enquete_id: string
  token: string
} | null

export type PortalData = {
  jogador: { id: string; nome: string; posicao_principal: string }
  temporada: { id: string; nome: string } | null
  proxima_partida: {
    id: string
    data: string
    local: string | null
    convocado: boolean
  } | null
  votacao: PortalVotacao
  classificacao: ClassificacaoEntry[]
  confrontos: ConfrontoEntry[]
  partidas: PortalPartida[]
  pagamentos: PortalPagamento[]
}


export async function GET(request: NextRequest, { params }: Params) {
  const { id: jogadorId } = await params
  const token = request.nextUrl.searchParams.get('token')

  if (!token) return Response.json({ error: 'Token obrigatório' }, { status: 400 })

  // Valida token
  const { data: jogador } = await supabase
    .from('jogadores')
    .select('id')
    .eq('id', jogadorId)
    .eq('portal_token', token)
    .eq('ativo', true)
    .single()

  if (!jogador) return Response.json({ error: 'Link inválido' }, { status: 401 })

  const data = await getPortalData(jogadorId)
  if (!data) return Response.json({ error: 'Jogador não encontrado' }, { status: 404 })

  return Response.json(data)
}
