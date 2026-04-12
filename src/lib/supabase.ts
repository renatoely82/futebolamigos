export type Posicao = 'Goleiro' | 'Zagueiro' | 'Lateral' | 'Volante' | 'Meia' | 'Atacante'
export type StatusPartida = 'agendada' | 'realizada' | 'cancelada'
export type Nivel = 1 | 2 | 3 | 4 | 5

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
  mensalista: boolean
  nivel: Nivel
  telefone: string | null
  aniversario: string | null
  observacoes: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Partida {
  id: string
  data: string
  local: string | null
  status: StatusPartida
  times_escolhidos: TeamSplit | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export interface PartidaJogador {
  id: string
  partida_id: string
  jogador_id: string
  confirmado: boolean
  adicionado_manualmente: boolean
  criado_em: string
}

export interface PartidaJogadorComDetalhes extends PartidaJogador {
  jogador: Jogador
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

export type Database = {
  public: {
    Tables: {
      jogadores: {
        Row: Jogador
        Insert: Omit<Jogador, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<Jogador, 'id' | 'criado_em' | 'atualizado_em'>>
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
    }
  }
}
