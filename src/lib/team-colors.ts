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

export function getTeamColor(nome: string, fallback = 'text-gray-700'): string {
  const normalized = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  return COLOR_MAP[normalized] ?? fallback
}
