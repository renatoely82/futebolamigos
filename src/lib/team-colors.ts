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

export function getTeamEmoji(nome: string): string {
  return EMOJI_MAP[normalize(nome)] ?? ''
}
