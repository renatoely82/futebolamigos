'use client'

import { useState, useEffect } from 'react'
import type { ClassificacaoEntry, Partida } from '@/lib/supabase'
import type { TeamSplit } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function horaFim(hora: string, duracaoMinutos: number): string {
  const [h, m] = hora.split(':').map(Number)
  const totalMin = h * 60 + m + duracaoMinutos
  return `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`
}

function useCountdown(targetDate: Date) {
  const [diff, setDiff] = useState(targetDate.getTime() - Date.now())

  useEffect(() => {
    const interval = setInterval(() => setDiff(targetDate.getTime() - Date.now()), 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return diff
}

function ProximaPartidaCard({ partida }: { partida: Partida }) {
  const [h, m] = partida.hora.split(':').map(Number)
  const target = parseISO(partida.data)
  target.setHours(h, m, 0, 0)

  const diff = useCountdown(target)
  const passada = diff <= 0

  const dias = Math.floor(diff / 86400000)
  const horas = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  const segs = Math.floor((diff % 60000) / 1000)

  const countdown = passada
    ? 'A decorrer ou já realizada'
    : dias > 0
      ? `Faltam ${dias}d ${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(segs).padStart(2, '0')}`
      : `Faltam ${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(segs).padStart(2, '0')}`

  const diaSemana = format(parseISO(partida.data), 'EEEE', { locale: ptBR })
  const diaSemanaCapit = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
  const dataFormatada = format(parseISO(partida.data), 'dd/MM', { locale: ptBR })
  const fim = horaFim(partida.hora, partida.duracao_minutos)

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a2a4a, #0f1e38)' }}>
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚽</span>
          <div>
            <p className="text-white font-semibold text-sm leading-snug">
              {diaSemanaCapit}, {dataFormatada} · {partida.hora}h às {fim}h
            </p>
            <p className={`text-xs mt-0.5 font-mono ${passada ? 'text-gray-400' : 'text-green-300'}`}>
              {countdown}
            </p>
            {partida.local && (
              <p className="text-white/50 text-xs mt-0.5">{partida.local}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props {
  classificacao: ClassificacaoEntry[]
  partidas: Partida[]
}

interface Destaque {
  emoji: string
  texto: React.ReactNode
  cor: string
}

function sequenciaAtual(ultimos5: ('V' | 'E' | 'D')[], resultado: 'V' | 'D'): number {
  // ultimos5 está ordenado do mais recente para o mais antigo
  let seq = 0
  for (const r of ultimos5) {
    if (r === resultado) seq++
    else break
  }
  return seq
}

function ordinal(n: number): string {
  return `${n}ª`
}

export default function DestaqueTab({ classificacao, partidas }: Props) {
  const destaques: Destaque[] = []

  // ── Última partida realizada ──────────────────────────────────
  const realizadas = partidas
    .filter(p => p.status === 'realizada' && p.placar_time_a != null && p.placar_time_b != null)
    .sort((a, b) => b.data.localeCompare(a.data))

  const rodadaAtual = realizadas.length

  if (realizadas.length > 0) {
    const ultima = realizadas[0]
    const pA = ultima.placar_time_a as number
    const pB = ultima.placar_time_b as number
    const data = format(parseISO(ultima.data), "d 'de' MMM", { locale: ptBR })

    let resultado: React.ReactNode
    if (pA > pB) {
      resultado = <><strong>{ultima.nome_time_a}</strong> venceu {pA} × {pB}</>
    } else if (pB > pA) {
      resultado = <><strong>{ultima.nome_time_b}</strong> venceu {pB} × {pA}</>
    } else {
      resultado = <>Empate {pA} × {pB} entre <strong>{ultima.nome_time_a}</strong> e <strong>{ultima.nome_time_b}</strong></>
    }

    destaques.push({
      emoji: '⚽',
      texto: <>{ordinal(rodadaAtual)} Rodada ({data}): {resultado}</>,
      cor: 'bg-green-50 border-green-200',
    })
  }

  // ── Mais quente: mais gols nas últimas 5 rodadas ──────────────
  if (realizadas.length > 0) {
    const ultimas5 = realizadas.slice(0, 5)
    const partidaIds = new Set(ultimas5.map(p => p.id))

    // Contar gols de cada jogador nas últimas 5 (via times_escolhidos + gols da classificação não disponível aqui)
    // Usamos ultimos5 de classificacaoEntry como proxy de forma, e gols totais para ranking
    // Melhor abordagem: ranking de gols totais (disponível em classificacao.gols)
    const topGoleador = [...classificacao]
      .filter(e => e.jogos >= 3)
      .sort((a, b) => b.gols - a.gols)[0]

    if (topGoleador && topGoleador.gols > 0) {
      // Calcular gols nas últimas 5 partidas usando times_escolhidos
      // Como não temos gols granulares por partida aqui, mostramos os gols totais
      destaques.push({
        emoji: '🔥',
        texto: <><strong>{topGoleador.nome}</strong> lidera com {topGoleador.gols} gol{topGoleador.gols !== 1 ? 's' : ''} na temporada</>,
        cor: 'bg-orange-50 border-orange-200',
      })
    }

    // Quem participou em todas as últimas 5 rodadas
    const presentes5: Record<string, number> = {}
    for (const p of ultimas5) {
      const tc = p.times_escolhidos as TeamSplit | null
      if (!tc) continue
      const jogadores = [...(tc.time_a ?? []), ...(tc.time_b ?? [])]
      for (const jid of jogadores) {
        presentes5[jid] = (presentes5[jid] ?? 0) + 1
      }
    }

    const semFalta = classificacao.filter(e => (presentes5[e.jogador_id] ?? 0) >= Math.min(5, ultimas5.length))
    if (semFalta.length > 0 && ultimas5.length >= 3) {
      const nomes = semFalta.map(e => e.nome)
      const label = nomes.length === 1
        ? <><strong>{nomes[0]}</strong> não faltou nenhuma das últimas {ultimas5.length} rodadas!</>
        : <><strong>{nomes.slice(0, -1).join(', ')}</strong> e <strong>{nomes[nomes.length - 1]}</strong> não faltaram às últimas {ultimas5.length} rodadas!</>
      destaques.push({
        emoji: '💪',
        texto: label,
        cor: 'bg-blue-50 border-blue-200',
      })
    }
  }

  // ── Sequência de vitórias ─────────────────────────────────────
  const topSequenciaV = [...classificacao]
    .map(e => ({ ...e, seq: sequenciaAtual(e.ultimos5, 'V') }))
    .filter(e => e.seq >= 3)
    .sort((a, b) => b.seq - a.seq)[0]

  if (topSequenciaV) {
    destaques.push({
      emoji: '🏆',
      texto: <><strong>{topSequenciaV.nome}</strong> está numa sequência de {topSequenciaV.seq} vitórias seguidas!</>,
      cor: 'bg-yellow-50 border-yellow-200',
    })
  }

  // ── Sequência de derrotas ─────────────────────────────────────
  const topSequenciaD = [...classificacao]
    .map(e => ({ ...e, seq: sequenciaAtual(e.ultimos5, 'D') }))
    .filter(e => e.seq >= 3)
    .sort((a, b) => b.seq - a.seq)[0]

  if (topSequenciaD) {
    destaques.push({
      emoji: '😓',
      texto: <><strong>{topSequenciaD.nome}</strong> está numa fase difícil: {topSequenciaD.seq} derrotas seguidas</>,
      cor: 'bg-red-50 border-red-200',
    })
  }

  // ── Líder da classificação ────────────────────────────────────
  if (classificacao.length > 0 && classificacao[0].jogos >= 3) {
    const lider = classificacao[0]
    destaques.push({
      emoji: '👑',
      texto: <><strong>{lider.nome}</strong> lidera com {lider.pontos} ponto{lider.pontos !== 1 ? 's' : ''} ({Math.round(lider.aproveitamento)}% de aproveitamento)</>,
      cor: 'bg-purple-50 border-purple-200',
    })
  }

  // ── Próxima partida agendada ──────────────────────────────────
  const proxima = partidas
    .filter(p => p.status === 'agendada')
    .sort((a, b) => a.data.localeCompare(b.data))[0]

  // ── Resumo geral da temporada ─────────────────────────────────
  const totalJogadores = classificacao.filter(e => e.jogos > 0).length
  const totalGols = classificacao.reduce((s, e) => s + e.gols, 0)

  const jogadoresComForma = classificacao.filter(e => e.jogos > 0 && e.ultimos5.length > 0)

  return (
    <div className="p-3 space-y-3">

      {/* Próxima partida */}
      {proxima && <ProximaPartidaCard partida={proxima} />}

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 divide-x divide-[#e0e0e0] border border-[#e0e0e0] rounded-xl overflow-hidden">
        <div className="py-2 text-center">
          <div className="text-lg font-bold text-green-700">{rodadaAtual}</div>
          <div className="text-xs text-gray-400">Rodadas</div>
        </div>
        <div className="py-2 text-center">
          <div className="text-lg font-bold text-green-700">{totalGols}</div>
          <div className="text-xs text-gray-400">Gols</div>
        </div>
        <div className="py-2 text-center">
          <div className="text-lg font-bold text-green-700">{totalJogadores}</div>
          <div className="text-xs text-gray-400">Jogadores</div>
        </div>
      </div>

      {/* Duas colunas em desktop, empilhado em mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">

        {/* Coluna esquerda — Destaques */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-0.5">
            Destaques Recentes
          </p>
          {destaques.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              Ainda sem dados suficientes.
            </div>
          ) : (
            <div className="space-y-1.5">
              {destaques.map((d, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 border rounded-lg px-3 py-2 ${d.cor}`}
                >
                  <span className="text-base leading-none shrink-0">{d.emoji}</span>
                  <p className="text-xs text-gray-700 leading-snug">{d.texto}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna direita — Forma Recente */}
        {jogadoresComForma.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-0.5">
              Forma Recente
            </p>
            <div className="bg-white border border-[#e0e0e0] rounded-xl divide-y divide-gray-100 overflow-hidden">
              {jogadoresComForma.slice(0, 10).map(e => (
                <div key={e.jogador_id} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="text-xs text-gray-700 font-medium truncate flex-1">{e.nome}</span>
                  <div className="flex gap-0.5 shrink-0">
                    {e.ultimos5.map((r, i) => (
                      <span
                        key={i}
                        className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          r === 'V' ? 'bg-green-500 text-white' :
                          r === 'D' ? 'bg-red-400 text-white' :
                          'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
