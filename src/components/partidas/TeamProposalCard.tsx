'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import type { Jogador, PropostaTimeComJogadores } from '@/lib/supabase'
import { PositionBadge } from '@/components/ui/Badge'
import { sortByPosition } from '@/lib/team-balancer'
import { getTeamColor } from '@/lib/team-colors'

interface TeamProposalCardProps {
  proposta: PropostaTimeComJogadores
  onSelect: () => void
  selected: boolean
  loading: boolean
  nomeTimeA: string
  nomeTimeB: string
  onTeamsChange?: (timeA: Jogador[], timeB: Jogador[]) => void
}

function PlayerContent({ jogador }: { jogador: Jogador }) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <PositionBadge posicao={jogador.posicao_principal} />
        <div className="flex gap-0.5 ml-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <div key={n} className={`w-1.5 h-1.5 rounded-sm ${n <= jogador.nivel ? 'bg-green-500' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
      <span className="text-gray-800 text-xs mt-0.5 block leading-snug">{jogador.nome}</span>
    </>
  )
}

function DraggablePlayer({ jogador, propNum, sourceTeam }: {
  jogador: Jogador
  propNum: number
  sourceTeam: 'time-a' | 'time-b'
}) {
  const dragId = `p${propNum}-${sourceTeam}-${jogador.id}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { jogador, sourceTeam },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`py-1.5 border-b border-gray-100 last:border-0 cursor-grab active:cursor-grabbing select-none transition-opacity ${isDragging ? 'opacity-30' : ''}`}
      {...listeners}
      {...attributes}
    >
      <PlayerContent jogador={jogador} />
    </div>
  )
}

function DroppableTeam({ id, label, score, players, propNum, isDropTarget }: {
  id: 'time-a' | 'time-b'
  label: string
  score: number
  players: Jogador[]
  propNum: number
  isDropTarget: boolean
}) {
  const { isOver, setNodeRef } = useDroppable({ id })
  const color = getTeamColor(label, id === 'time-a' ? 'text-green-600' : 'text-blue-600')

  return (
    <div
      ref={setNodeRef}
      className={`p-4 transition-colors ${isOver && isDropTarget ? 'bg-gray-50 rounded-lg' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`${color} font-semibold text-sm`}>{label}</span>
        <span className="text-gray-500 text-xs">Força: {score}</span>
      </div>
      {sortByPosition(players).map(j => (
        <DraggablePlayer key={j.id} jogador={j} propNum={propNum} sourceTeam={id} />
      ))}
      {players.length === 0 && (
        <div className="text-gray-400 text-xs text-center py-4 border border-dashed border-gray-300 rounded-lg">
          Arraste um jogador aqui
        </div>
      )}
    </div>
  )
}

export default function TeamProposalCard({
  proposta,
  onSelect,
  selected,
  loading,
  nomeTimeA,
  nomeTimeB,
  onTeamsChange,
}: TeamProposalCardProps) {
  const [draggingSourceTeam, setDraggingSourceTeam] = useState<'time-a' | 'time-b' | null>(null)
  const [activePlayer, setActivePlayer] = useState<Jogador | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const scoreA = proposta.time_a.reduce((s, j) => s + j.nivel, 0)
  const scoreB = proposta.time_b.reduce((s, j) => s + j.nivel, 0)

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data) {
      setActivePlayer(data.jogador as Jogador)
      setDraggingSourceTeam(data.sourceTeam as 'time-a' | 'time-b')
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePlayer(null)
    setDraggingSourceTeam(null)

    const { active, over } = event
    if (!over || !onTeamsChange) return

    const sourceTeam = active.data.current?.sourceTeam as 'time-a' | 'time-b'
    const targetTeam = over.id as 'time-a' | 'time-b'
    if (sourceTeam === targetTeam) return

    const jogador = active.data.current?.jogador as Jogador
    if (!jogador) return

    let newTimeA = [...proposta.time_a]
    let newTimeB = [...proposta.time_b]

    if (sourceTeam === 'time-a') {
      newTimeA = newTimeA.filter(j => j.id !== jogador.id)
      newTimeB = [...newTimeB, jogador]
    } else {
      newTimeB = newTimeB.filter(j => j.id !== jogador.id)
      newTimeA = [...newTimeA, jogador]
    }

    onTeamsChange(sortByPosition(newTimeA), sortByPosition(newTimeB))
  }

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all ${
      selected ? 'border-green-500 ring-1 ring-green-500/50' : 'border-[#e0e0e0] hover:border-[#c8c8c8]'
    }`}>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-800 font-semibold">Proposta {proposta.proposta_numero}</span>
          {onTeamsChange && (
            <span className="text-gray-500 text-xs">• arraste para trocar</span>
          )}
        </div>
        {selected && (
          <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">Selecionada</span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          <DroppableTeam
            id="time-a"
            label={nomeTimeA}
            score={scoreA}
            players={proposta.time_a}
            propNum={proposta.proposta_numero}
            isDropTarget={draggingSourceTeam === 'time-b'}
          />
          <DroppableTeam
            id="time-b"
            label={nomeTimeB}
            score={scoreB}
            players={proposta.time_b}
            propNum={proposta.proposta_numero}
            isDropTarget={draggingSourceTeam === 'time-a'}
          />
        </div>
        <DragOverlay>
          {activePlayer && (
            <div className="bg-white border border-green-500/60 rounded-lg p-2.5 shadow-2xl cursor-grabbing min-w-[140px]">
              <PlayerContent jogador={activePlayer} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onSelect}
          disabled={loading || selected}
          className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors ${
            selected
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
          }`}
        >
          {selected ? 'Selecionada' : 'Escolher este time'}
        </button>
      </div>
    </div>
  )
}
