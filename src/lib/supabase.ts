export type Posicao = 'Goleiro' | 'Zagueiro' | 'Lateral' | 'Volante' | 'Meia' | 'Atacante'
export type StatusPartida = 'agendada' | 'realizada' | 'cancelada'
export type Nivel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export const POSICOES: Posicao[] = ['Goleiro', 'Zagueiro', 'Lateral', 'Volante', 'Meia', 'Atacante']

export const POSICAO_CORES: Record<Posicao, string> = {
  Goleiro: 'bg-yellow-500 text-yellow-950',
  Zagueiro: 'bg-blue-600 text-white',
  Lateral: 'bg-blue-400 text-blue-950',
  Volante: 'bg-green-600 text-white',
  Meia: 'bg-green-400 text-green-950',
  Atacante: 'bg-red-500 text-white',
}

export const POSICAO_GRUPO: Record<Posicao, 'goleiro' | 'defesa' | 'meio' | 'ataque'> = {
  Goleiro: 'goleiro',
  Zagueiro: 'defesa',
  Lateral: 'defesa',
  Volante: 'meio',
  Meia: 'meio',
  Atacante: 'ataque',
}

export interface Jogador {
  id: string
  nome: string
  posicao_principal: Posicao
  posicao_secundaria_1: Posicao | null
  posicao_secundaria_2: Posicao | null
  nivel: Nivel
  telefone: string | null
  aniversario: string | null
  observacoes: string | null
  email: string | null
  ativo: boolean
  portal_token: string
  criado_em: string
  atualizado_em: string
}

export interface TemporadaMensalista {
  id: string
  temporada_id: string
  jogador_id: string
  meses: number[] | null
  criado_em: string
}

export interface TemporadaDiretoria {
  id: string
  temporada_id: string
  jogador_id: string
  criado_em: string
}

export interface TemporadaDiretoriaComJogador extends TemporadaDiretoria {
  jogador: Jogador
}

export type FormaPagamento = 'CASH' | 'BIZUM' | 'PIX'

export interface PagamentoMensalista {
  id: string
  temporada_id: string
  jogador_id: string
  mes: number
  ano: number
  pago: boolean
  data_pagamento: string | null
  observacoes: string | null
  valor_pago: number | null
  credito: number | null
  forma_pagamento: FormaPagamento | null
  criado_em: string
  atualizado_em: string
}

export interface PagamentoMensalistaComJogador extends PagamentoMensalista {
  jogador: Jogador
}

export type CategoriaRegra = 'pagamento' | 'desistencias' | 'penalizacoes' | 'geral'

export interface Regra {
  id: string
  temporada_id: string
  categoria: CategoriaRegra
  numero: number
  descricao: string
  ativa: boolean
  criado_em: string
  atualizado_em: string
}

export interface Temporada {
  id: string
  nome: string
  data_inicio: string
  data_fim: string
  ativa: boolean
  valor_mensalidade: number | null
  valor_diarista: number | null
  criado_em: string
  atualizado_em: string
}

export interface PagamentoDiarista {
  id: string
  partida_id: string
  jogador_id: string
  pago: boolean
  valor_pago: number | null
  forma_pagamento: FormaPagamento | null
  data_pagamento: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export interface PagamentoDiaristaComJogador extends PagamentoDiarista {
  jogador: Jogador
}

export interface TemporadaValoresMes {
  id: string
  temporada_id: string
  mes: number
  ano: number
  valor_mensalidade: number | null
  valor_diarista: number | null
  criado_em: string
  atualizado_em: string
}

export interface ClassificacaoEntry {
  jogador_id: string
  nome: string
  posicao_principal: Posicao
  jogos: number
  vitorias: number
  empates: number
  derrotas: number
  pontos: number
  gols: number
  gols_contra: number
  aproveitamento: number
  ultimos5: ('V' | 'E' | 'D')[]
}

export interface Partida {
  id: string
  data: string
  local: string | null
  status: StatusPartida
  times_escolhidos: TeamSplit | null
  observacoes: string | null
  numero_jogadores: number | null
  nome_time_a: string
  nome_time_b: string
  placar_time_a: number | null
  placar_time_b: number | null
  temporada_id: string | null
  votacao_enquete_id: string | null
  criado_em: string
  atualizado_em: string
}

export interface VotacaoStatus {
  enquete_id: string
  partida_id: string
  ativa: boolean
  propostas_com_votos: { proposta_numero: 1 | 2 | 3; opcao_id: string; votos: number }[]
  tokens: { jogador_id: string; token: string; usado: boolean; jogadores: { nome: string } | null }[]
}

export interface Gol {
  id: string
  partida_id: string
  jogador_id: string
  quantidade: number
  gol_contra: boolean
  criado_em: string
}

export interface GolComDetalhes extends Gol {
  jogador: Jogador
}

export interface PartidaJogador {
  id: string
  partida_id: string
  jogador_id: string
  confirmado: boolean
  adicionado_manualmente: boolean
  posicao_convocacao: Posicao | null
  criado_em: string
}

export interface PartidaJogadorComDetalhes extends PartidaJogador {
  jogador: Jogador
}

export interface Substituicao {
  id: string
  partida_id: string
  jogador_ausente_id: string
  jogador_substituto_id: string
  motivo: string | null
  criado_em: string
}

export interface SubstituicaoComDetalhes extends Substituicao {
  jogador_ausente: Jogador
  jogador_substituto: Jogador
}

export interface TeamSplit {
  time_a: string[]
  time_b: string[]
}

export interface PropostaTime {
  id: string
  partida_id: string
  proposta_numero: 1 | 2 | 3
  time_a: string[]
  time_b: string[]
  selecionada: boolean
  criado_em: string
}

export interface PropostaTimeComJogadores {
  id: string
  proposta_numero: 1 | 2 | 3
  time_a: Jogador[]
  time_b: Jogador[]
  selecionada: boolean
}

/**
 * Extrai um registro único de um join do Supabase.
 * O Supabase pode inferir relações como array — este helper normaliza para objeto | null.
 */
export function singleJoin<T>(value: unknown): T | null {
  if (value == null) return null
  if (Array.isArray(value)) return (value[0] as T) ?? null
  return value as T
}

export type Database = {
  public: {
    Tables: {
      jogadores: {
        Row: Jogador
        Insert: Omit<Jogador, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<Jogador, 'id' | 'criado_em' | 'atualizado_em'>>
      }
      temporadas: {
        Row: Temporada
        Insert: Omit<Temporada, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<Temporada, 'id' | 'criado_em' | 'atualizado_em'>>
      }
      partidas: {
        Row: Partida
        Insert: Omit<Partida, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<Partida, 'id' | 'criado_em' | 'atualizado_em'>>
      }
      partida_jogadores: {
        Row: PartidaJogador
        Insert: Omit<PartidaJogador, 'id' | 'criado_em'>
        Update: Partial<Omit<PartidaJogador, 'id' | 'criado_em'>>
      }
      propostas_times: {
        Row: PropostaTime
        Insert: Omit<PropostaTime, 'id' | 'criado_em'>
        Update: Partial<Omit<PropostaTime, 'id' | 'criado_em'>>
      }
      gols: {
        Row: Gol
        Insert: Omit<Gol, 'id' | 'criado_em'>
        Update: Partial<Omit<Gol, 'id' | 'criado_em'>>
      }
      temporada_mensalistas: {
        Row: TemporadaMensalista
        Insert: Omit<TemporadaMensalista, 'id' | 'criado_em'>
        Update: Partial<Omit<TemporadaMensalista, 'id' | 'criado_em'>>
      }
      pagamentos_mensalistas: {
        Row: PagamentoMensalista
        Insert: Omit<PagamentoMensalista, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<PagamentoMensalista, 'id' | 'criado_em' | 'atualizado_em'>>
      }
      pagamentos_diaristas: {
        Row: PagamentoDiarista
        Insert: Omit<PagamentoDiarista, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<PagamentoDiarista, 'id' | 'criado_em' | 'atualizado_em'>>
      }
      temporada_valores_mes: {
        Row: TemporadaValoresMes
        Insert: Omit<TemporadaValoresMes, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<TemporadaValoresMes, 'id' | 'criado_em' | 'atualizado_em'>>
      }
      substituicoes: {
        Row: Substituicao
        Insert: Omit<Substituicao, 'id' | 'criado_em'>
        Update: Partial<Omit<Substituicao, 'id' | 'criado_em'>>
      }
    }
  }
}
