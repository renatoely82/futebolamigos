import type { Jogador, TeamSplit, PropostaTimeComJogadores } from './supabase'
import { POSICAO_GRUPO, POSICOES } from './supabase'

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA DO BALANCEADOR DE TIMES
//
// Objetivo: gerar 3 propostas de times equilibradas em nível e posição,
// garantindo variedade entre elas e em relação ao jogo anterior.
//
// O processo tem 4 etapas principais por proposta:
//   1. Distribuição de goleiros (um por time, aleatório)
//   2. Distribuição de linha por grupo de posição (defesa → meio → ataque),
//      alternando jogadores entre times para manter tamanhos iguais
//   3. Correção de nível: troca um par de jogadores de mesma posição-grupo
//      se isso reduzir a diferença de nível entre os times
//   4. Filtro de diversidade: descarta propostas iguais entre si ou muito
//      parecidas com o jogo anterior (similaridade Jaccard > 70%)
// ─────────────────────────────────────────────────────────────────────────────

// Ordena jogadores por posição (ordem canônica de POSICOES) e depois por nome.
// Usado para exibir os times de forma organizada (goleiro → defesa → meio → ataque).
export function sortByPosition(players: Jogador[]): Jogador[] {
  return [...players].sort((a, b) => {
    const posDiff = POSICOES.indexOf(a.posicao_principal) - POSICOES.indexOf(b.posicao_principal)
    if (posDiff !== 0) return posDiff
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

// Fisher-Yates shuffle — embaralha um array sem modificar o original.
// Usado para introduzir aleatoriedade em cada proposta gerada.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Similaridade Jaccard ────────────────────────────────────────────────────
// Mede o quanto dois conjuntos se sobrepõem: |interseção| / |união|.
// Resultado: 0 = completamente diferentes, 1 = idênticos.
// Usada para comparar composições de times.
function jaccard(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  if (union.size === 0) return 0
  return intersection.size / union.size
}

// ─── Filtro de diversidade em relação ao jogo anterior ───────────────────────
// Compara o time A do candidato contra o time A e o time B do jogo anterior
// (porque os nomes dos times podem ter rotacionado entre jogos).
// Se o melhor alinhamento for > 70% igual, a proposta é descartada —
// isso força os times a serem suficientemente diferentes do último jogo.
function tooSimilar(candidate: TeamSplit, previous: TeamSplit): boolean {
  const candA = new Set(candidate.time_a)
  const candB = new Set(candidate.time_b)
  const prevA = new Set(previous.time_a)
  const prevB = new Set(previous.time_b)

  // Verifica os dois alinhamentos possíveis (A↔A e A↔B) e pega o maior overlap
  const overlapAA = jaccard(candA, prevA)
  const overlapAB = jaccard(candA, prevB)
  const bestOverlap = Math.max(overlapAA, overlapAB)

  return bestOverlap > 0.70
}

// ─── Geração de uma proposta ──────────────────────────────────────────────────
// Cria um sorteio completo de um par de times a partir da lista de jogadores.
function generateOneSplit(players: Jogador[]): { split: TeamSplit; jogadores: { time_a: Jogador[]; time_b: Jogador[] } } {

  // ── Etapa 1: Goleiros ──
  // Cada time deve ter no máximo um goleiro titular.
  // Com 2+ goleiros: distribui um por time, os excedentes alternados.
  // Com 1 goleiro: vai aleatoriamente para qualquer um dos times.
  const goalkeepers = shuffle(players.filter(p => p.posicao_principal === 'Goleiro'))
  const outfield = players.filter(p => p.posicao_principal !== 'Goleiro')

  let teamA: Jogador[] = []
  let teamB: Jogador[] = []

  if (goalkeepers.length >= 2) {
    teamA.push(goalkeepers[0])
    teamB.push(goalkeepers[1])
    const extraGks = goalkeepers.slice(2)
    extraGks.forEach((gk, i) => {
      if (i % 2 === 0) teamA.push(gk)
      else teamB.push(gk)
    })
  } else if (goalkeepers.length === 1) {
    if (Math.random() > 0.5) teamA.push(goalkeepers[0])
    else teamB.push(goalkeepers[0])
  }

  // ── Etapa 2: Distribuição por grupo de posição ──
  // Defesas, meias e atacantes são tratados em grupos separados para garantir
  // que cada time receba jogadores de todas as linhas.
  // Dentro de cada grupo, os jogadores são embaralhados (aleatoriedade) e
  // então distribuídos alternadamente: vai para o time com menos jogadores,
  // mantendo os tamanhos o mais próximos possíveis ao longo do processo.
  const defesas = shuffle(outfield.filter(p => POSICAO_GRUPO[p.posicao_principal] === 'defesa'))
  const meias = shuffle(outfield.filter(p => POSICAO_GRUPO[p.posicao_principal] === 'meio'))
  const atacantes = shuffle(outfield.filter(p => POSICAO_GRUPO[p.posicao_principal] === 'ataque'))

  for (const group of [defesas, meias, atacantes]) {
    for (const player of group) {
      if (teamA.length <= teamB.length) teamA.push(player)
      else teamB.push(player)
    }
  }

  // ── Etapa 3: Correção de nível ──
  // Calcula a diferença de nível total entre os times (soma dos níveis individuais).
  // Se a diferença for >= 3 pontos, tenta encontrar uma troca que a reduza:
  //   - Busca um par (jogador do time mais forte × jogador do time mais fraco)
  //   - Ambos devem ser do mesmo grupo de posição (defesa↔defesa, meio↔meio, ataque↔ataque)
  //     para não desequilibrar a distribuição tática
  //   - Goleiros nunca são trocados nesta etapa (evita deixar um time sem goleiro)
  //   - Realiza no máximo uma troca por proposta (a primeira que melhore o equilíbrio)
  const scoreA = teamA.reduce((s, p) => s + p.nivel, 0)
  const scoreB = teamB.reduce((s, p) => s + p.nivel, 0)
  const diff = Math.abs(scoreA - scoreB)

  if (diff >= 3) {
    const stronger = scoreA > scoreB ? teamA : teamB
    const weaker = scoreA > scoreB ? teamB : teamA
    const isStrongerA = scoreA > scoreB

    let swapped = false
    outer: for (const ps of stronger.filter(p => p.posicao_principal !== 'Goleiro')) {
      for (const pw of weaker.filter(p => p.posicao_principal !== 'Goleiro')) {
        if (POSICAO_GRUPO[ps.posicao_principal] === POSICAO_GRUPO[pw.posicao_principal]) {
          const newScoreStrong = stronger.reduce((s, p) => s + p.nivel, 0) - ps.nivel + pw.nivel
          const newScoreWeak = weaker.reduce((s, p) => s + p.nivel, 0) - pw.nivel + ps.nivel
          const newDiff = Math.abs(newScoreStrong - newScoreWeak)
          if (newDiff < diff) {
            if (isStrongerA) {
              teamA = teamA.map(p => p.id === ps.id ? pw : p)
              teamB = teamB.map(p => p.id === pw.id ? ps : p)
            } else {
              teamB = teamB.map(p => p.id === ps.id ? pw : p)
              teamA = teamA.map(p => p.id === pw.id ? ps : p)
            }
            swapped = true
            break outer
          }
        }
      }
    }
    void swapped
  }

  return {
    split: {
      time_a: teamA.map(p => p.id),
      time_b: teamB.map(p => p.id),
    },
    // Times são ordenados por posição para exibição (não afeta o sorteio)
    jogadores: { time_a: sortByPosition(teamA), time_b: sortByPosition(teamB) },
  }
}

// ─── Geração das 3 propostas ──────────────────────────────────────────────────
// Gera propostas em loop até ter 3 válidas, ou até 60 tentativas.
// Uma proposta é descartada se:
//   a) for idêntica a uma proposta já aceita nesta rodada (evita repetição)
//   b) for muito similar ao jogo anterior (Jaccard > 70%) — força variedade
//
// Se após 60 tentativas não houver 3 propostas (situação rara, ocorre com
// poucos jogadores onde há pouca diversidade possível), o filtro de
// similaridade com o jogo anterior é removido como fallback para garantir
// que sempre sejam apresentadas 3 opções.
export function generateTeamProposals(
  players: Jogador[],
  previousTeams: TeamSplit | null
): PropostaTimeComJogadores[] {
  const proposals: PropostaTimeComJogadores[] = []
  let attempts = 0

  while (proposals.length < 3 && attempts < 60) {
    const { split, jogadores } = generateOneSplit(players)

    const isDuplicate = proposals.some(
      p =>
        JSON.stringify(p.time_a.map(j => j.id).sort()) === JSON.stringify(jogadores.time_a.map(j => j.id).sort())
    )

    if (!isDuplicate && (previousTeams === null || !tooSimilar(split, previousTeams))) {
      proposals.push({
        id: '',
        proposta_numero: (proposals.length + 1) as 1 | 2 | 3,
        time_a: jogadores.time_a,
        time_b: jogadores.time_b,
        selecionada: false,
      })
    }
    attempts++
  }

  // Fallback: preenche propostas restantes sem o filtro de similaridade
  while (proposals.length < 3) {
    const { jogadores } = generateOneSplit(players)
    proposals.push({
      id: '',
      proposta_numero: (proposals.length + 1) as 1 | 2 | 3,
      time_a: jogadores.time_a,
      time_b: jogadores.time_b,
      selecionada: false,
    })
  }

  return proposals
}
