import type { Jogador, TeamSplit, PropostaTimeComJogadores } from './supabase'
import { POSICAO_GRUPO } from './supabase'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function jaccard(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  if (union.size === 0) return 0
  return intersection.size / union.size
}

function tooSimilar(candidate: TeamSplit, previous: TeamSplit): boolean {
  const candA = new Set(candidate.time_a)
  const candB = new Set(candidate.time_b)
  const prevA = new Set(previous.time_a)
  const prevB = new Set(previous.time_b)

  const overlapAA = jaccard(candA, prevA)
  const overlapAB = jaccard(candA, prevB)
  const bestOverlap = Math.max(overlapAA, overlapAB)

  return bestOverlap > 0.70
}

function generateOneSplit(players: Jogador[]): { split: TeamSplit; jogadores: { time_a: Jogador[]; time_b: Jogador[] } } {
  const goalkeepers = shuffle(players.filter(p => p.posicao_principal === 'Goleiro'))
  const outfield = players.filter(p => p.posicao_principal !== 'Goleiro')

  let teamA: Jogador[] = []
  let teamB: Jogador[] = []

  // Assign goalkeepers
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

  // Group outfield by position group and shuffle
  const defesas = shuffle(outfield.filter(p => POSICAO_GRUPO[p.posicao_principal] === 'defesa'))
  const meias = shuffle(outfield.filter(p => POSICAO_GRUPO[p.posicao_principal] === 'meio'))
  const atacantes = shuffle(outfield.filter(p => POSICAO_GRUPO[p.posicao_principal] === 'ataque'))

  // Distribute each group alternating to balance team sizes
  for (const group of [defesas, meias, atacantes]) {
    for (const player of group) {
      if (teamA.length <= teamB.length) teamA.push(player)
      else teamB.push(player)
    }
  }

  // Level-balance correction pass
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
    jogadores: { time_a: teamA, time_b: teamB },
  }
}

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

  // Fallback: fill remaining without similarity constraint
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
