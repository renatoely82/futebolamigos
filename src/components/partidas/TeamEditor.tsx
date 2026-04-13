'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import type { Jogador } from '@/lib/supabase'
import { PositionBadge } from '@/components/ui/Badge'
import { sortByPosition } from '@/lib/team-balancer'
import { getTeamColor } from '@/lib/team-colors'

function PlayerContent({ jogador }: { jogador: Jogador }) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <PositionBadge posicao={jogador.posicao_principal} />
        <div className="flex gap-0.5 ml-auto">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className={`w-2 h-2 rounded-sm ${n <= jogador.nivel ? 'bg-green-500' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
      <span className="text-gray-800 text-xs mt-0.5 block leading-snug">{jogador.nome}</span>
    </>
  )
}

type ZoneId = 'time-a' | 'time-b' | 'banco'

function DraggablePlayer({ jogador, sourceZone }: {
  jogador: Jogador
  sourceZone: ZoneId
}) {
  const dragId = `editor-${sourceZone}-${jogador.id}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { jogador, sourceZone },
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

function DroppableZone({ id, label, color, players, isOver, saving }: {
  id: ZoneId
  label: string
  color: string
  players: Jogador[]
  isOver: boolean
  saving: boolean
}) {
  const { setNodeRef } = useDroppable({ id })
  const score = players.reduce((s, j) => s + j.nivel, 0)

  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded-xl border transition-colors ${
        isOver ? 'border-green-500/50 bg-green-50' : 'border-[#e2e8f0] bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`${color} font-semibold text-sm`}>{label}</span>
        {id !== 'banco' && (
          <span className="text-gray-500 text-xs">
            {saving ? '...' : `Força: ${score}`} · {players.length} jogadores
          </span>
        )}
        {id === 'banco' && (
          <span className="text-gray-500 text-xs">{players.length} disponíveis</span>
        )}
      </div>
      {sortByPosition(players).map(j => (
        <DraggablePlayer key={j.id} jogador={j} sourceZone={id} />
      ))}
      {players.length === 0 && (
        <div className="text-gray-400 text-xs text-center py-4 border border-dashed border-gray-300 rounded-lg">
          Arraste um jogador aqui
        </div>
      )}
    </div>
  )
}

interface TeamEditorProps {
  initialTimeA: Jogador[]
  initialTimeB: Jogador[]
  initialBanco: Jogador[]
  nomeTimeA: string
  nomeTimeB: string
  onSave: (timeA: Jogador[], timeB: Jogador[]) => Promise<void>
}

export default function TeamEditor({
  initialTimeA,
  initialTimeB,
  initialBanco,
  nomeTimeA,
  nomeTimeB,
  onSave,
}: TeamEditorProps) {
  const [timeA, setTimeA] = useState<Jogador[]>(sortByPosition(initialTimeA))
  const [timeB, setTimeB] = useState<Jogador[]>(sortByPosition(initialTimeB))
  const [banco, setBanco] = useState<Jogador[]>(sortByPosition(initialBanco))
  const [activePlayer, setActivePlayer] = useState<Jogador | null>(null)
  const [overZone, setOverZone] = useState<ZoneId | null>(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function getZone(id: ZoneId) {
    if (id === 'time-a') return timeA
    if (id === 'time-b') return timeB
    return banco
  }

  function setZone(id: ZoneId, players: Jogador[]) {
    if (id === 'time-a') setTimeA(sortByPosition(players))
    else if (id === 'time-b') setTimeB(sortByPosition(players))
    else setBanco(sortByPosition(players))
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data) setActivePlayer(data.jogador as Jogador)
  }

  function handleDragOver(event: DragOverEvent) {
    setOverZone(event.over ? (event.over.id as ZoneId) : null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActivePlayer(null)
    setOverZone(null)

    const { active, over } = event
    if (!over) return

    const sourceZone = active.data.current?.sourceZone as ZoneId
    const targetZone = over.id as ZoneId
    if (sourceZone === targetZone) return

    const jogador = active.data.current?.jogador as Jogador
    if (!jogador) return

    const newSource = getZone(sourceZone).filter(j => j.id !== jogador.id)
    const newTarget = [...getZone(targetZone), jogador]

    setZone(sourceZone, newSource)
    setZone(targetZone, newTarget)

    // Compute final time_a and time_b after state update
    const finalA = sourceZone === 'time-a' ? newSource : targetZone === 'time-a' ? newTarget : timeA
    const finalB = sourceZone === 'time-b' ? newSource : targetZone === 'time-b' ? newTarget : timeB

    setSaving(true)
    await onSave(finalA, finalB)
    setSaving(false)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <DroppableZone
            id="time-a"
            label={nomeTimeA}
            color={getTeamColor(nomeTimeA, 'text-green-600')}
            players={timeA}
            isOver={overZone === 'time-a'}
            saving={saving}
          />
          <DroppableZone
            id="time-b"
            label={nomeTimeB}
            color={getTeamColor(nomeTimeB, 'text-blue-600')}
            players={timeB}
            isOver={overZone === 'time-b'}
            saving={saving}
          />
        </div>

        {banco.length > 0 && (
          <DroppableZone
            id="banco"
            label="Jogadores disponíveis"
            color="text-gray-500"
            players={banco}
            isOver={overZone === 'banco'}
            saving={saving}
          />
        )}

        {banco.length === 0 && (
          <div className="text-center py-3 text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl">
            Todos os jogadores estão em um time
          </div>
        )}
      </div>

      <DragOverlay>
        {activePlayer && (
          <div className="bg-white border border-green-500/60 rounded-lg p-2.5 shadow-2xl cursor-grabbing min-w-[160px]">
            <PlayerContent jogador={activePlayer} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
