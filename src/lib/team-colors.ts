const COLOR_MAP: Record<string, string> = {
  amarelo: 'text-yellow-500',
  azul: 'text-blue-600',
  vermelho: 'text-red-600',
  verde: 'text-green-600',
  preto: 'text-gray-900',
  branco: 'text-gray-400',
  laranja: 'text-orange-500',
  roxo: 'text-purple-600',
  rosa: 'text-pink-500',
  cinza: 'text-gray-500',
  ciano: 'text-cyan-500',
  marrom: 'text-amber-800',
}

const BG_MAP: Record<string, string> = {
  amarelo: 'bg-yellow-50',
  azul: 'bg-blue-50',
  vermelho: 'bg-red-50',
  verde: 'bg-green-50',
  preto: 'bg-gray-100',
  branco: 'bg-gray-50',
  laranja: 'bg-orange-50',
  roxo: 'bg-purple-50',
  rosa: 'bg-pink-50',
  cinza: 'bg-gray-100',
  ciano: 'bg-cyan-50',
  marrom: 'bg-amber-50',
}

const BAR_MAP: Record<string, string> = {
  amarelo: 'bg-yellow-400',
  azul: 'bg-blue-500',
  vermelho: 'bg-red-500',
  verde: 'bg-green-500',
  preto: 'bg-gray-700',
  branco: 'bg-gray-300',
  laranja: 'bg-orange-400',
  roxo: 'bg-purple-500',
  rosa: 'bg-pink-400',
  cinza: 'bg-gray-400',
  ciano: 'bg-cyan-400',
  marrom: 'bg-amber-700',
}

const EMOJI_MAP: Record<string, string> = {
  amarelo: '🟡',
  azul: '🔵',
  vermelho: '🔴',
  verde: '🟢',
  preto: '⚫',
  branco: '⚪',
  laranja: '🟠',
  roxo: '🟣',
  rosa: '🩷',
  cinza: '🩶',
  ciano: '🩵',
  marrom: '🟤',
}

function normalize(nome: string): string {
  return nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

export function getTeamColor(nome: string, fallback = 'text-gray-700'): string {
  return COLOR_MAP[normalize(nome)] ?? fallback
}

export function getTeamBg(nome: string, fallback = 'bg-gray-50'): string {
  return BG_MAP[normalize(nome)] ?? fallback
}

export function getTeamBar(nome: string, fallback = 'bg-gray-400'): string {
  return BAR_MAP[normalize(nome)] ?? fallback
}

export function getTeamEmoji(nome: string): string {
  return EMOJI_MAP[normalize(nome)] ?? ''
}
