import type { Partida } from '@/lib/supabase'

export type PartidaComCount = Partida & { player_count: number }
