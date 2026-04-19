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
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import PlayerMoveBottomSheet from './PlayerMoveBottomSheet'

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

function TappablePlayer({ jogador, sourceZone, selected, onTap }: {
  jogador: Jogador
  sourceZone: ZoneId
  selected: boolean
  onTap: (jogador: Jogador, zone: ZoneId) => void
}) {
  return (
    <div
      onClick={() => onTap(jogador, sourceZone)}
      className={`py-1.5 border-b border-gray-100 last:border-0 select-none transition-all rounded-lg px-1 -mx-1 ${
        selected
          ? 'bg-green-50 border-l-2 border-l-green-500 pl-2'
          : 'active:bg-gray-50'
      }`}
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
        isOver ? 'border-green-500/50 bg-green-50' : 'border-[#e0e0e0] bg-white'
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

function TappableZone({ id, label, color, players, saving, selectedPlayer, selectedZone, onTap }: {
  id: ZoneId
  label: string
  color: string
  players: Jogador[]
  saving: boolean
  selectedPlayer: Jogador | null
  selectedZone: ZoneId | null
  onTap: (jogador: Jogador, zone: ZoneId) => void
}) {
  const score = players.reduce((s, j) => s + j.nivel, 0)

  return (
    <div className="p-4 rounded-xl border border-[#e0e0e0] bg-white">
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
        <TappablePlayer
          key={j.id}
          jogador={j}
          sourceZone={id}
          selected={selectedPlayer?.id === j.id && selectedZone === id}
          onTap={onTap}
        />
      ))}
      {players.length === 0 && (
        <div className="text-gray-400 text-xs text-center py-4 border border-dashed border-gray-300 rounded-lg">
          Toque em um jogador para mover
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

  // Mobile tap-to-select state
  const isTouch = useIsTouchDevice()
  const [selectedPlayer, setSelectedPlayer] = useState<Jogador | null>(null)
  const [selectedZone, setSelectedZone] = useState<ZoneId | null>(null)

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

  async function movePlayer(jogador: Jogador, fromZone: ZoneId, toZone: ZoneId) {
    if (fromZone === toZone) return

    const newSource = getZone(fromZone).filter(j => j.id !== jogador.id)
    const newTarget = [...getZone(toZone), jogador]

    setZone(fromZone, newSource)
    setZone(toZone, newTarget)

    const finalA = fromZone === 'time-a' ? newSource : toZone === 'time-a' ? newTarget : timeA
    const finalB = fromZone === 'time-b' ? newSource : toZone === 'time-b' ? newTarget : timeB

    setSaving(true)
    await onSave(finalA, finalB)
    setSaving(false)
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
    const jogador = active.data.current?.jogador as Jogador
    if (!jogador) return

    await movePlayer(jogador, sourceZone, targetZone)
  }

  // Mobile: tap a player to open bottom sheet
  function handleTap(jogador: Jogador, zone: ZoneId) {
    if (selectedPlayer?.id === jogador.id && selectedZone === zone) {
      // Deselect if tapping same player
      setSelectedPlayer(null)
      setSelectedZone(null)
    } else {
      setSelectedPlayer(jogador)
      setSelectedZone(zone)
    }
  }

  async function handleMoveFromSheet(targetZoneId: string) {
    if (!selectedPlayer || !selectedZone) return
    await movePlayer(selectedPlayer, selectedZone, targetZoneId as ZoneId)
    setSelectedPlayer(null)
    setSelectedZone(null)
  }

  const zoneLabels: Record<ZoneId, string> = {
    'time-a': nomeTimeA,
    'time-b': nomeTimeB,
    'banco': 'Banco',
  }

  const zoneColors: Record<ZoneId, string> = {
    'time-a': getTeamColor(nomeTimeA, 'text-green-600'),
    'time-b': getTeamColor(nomeTimeB, 'text-blue-600'),
    'banco': 'text-gray-500',
  }

  const allZones: ZoneId[] = ['time-a', 'time-b', 'banco']

  if (isTouch) {
    return (
      <>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TappableZone
              id="time-a"
              label={nomeTimeA}
              color={zoneColors['time-a']}
              players={timeA}
              saving={saving}
              selectedPlayer={selectedPlayer}
              selectedZone={selectedZone}
              onTap={handleTap}
            />
            <TappableZone
              id="time-b"
              label={nomeTimeB}
              color={zoneColors['time-b']}
              players={timeB}
              saving={saving}
              selectedPlayer={selectedPlayer}
              selectedZone={selectedZone}
              onTap={handleTap}
            />
          </div>

          {banco.length > 0 && (
            <TappableZone
              id="banco"
              label="Jogadores disponíveis"
              color="text-gray-500"
              players={banco}
              saving={saving}
              selectedPlayer={selectedPlayer}
              selectedZone={selectedZone}
              onTap={handleTap}
            />
          )}

          {banco.length === 0 && (
            <div className="text-center py-3 text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl">
              Todos os jogadores estão em um time
            </div>
          )}
        </div>

        {selectedPlayer && selectedZone && (
          <PlayerMoveBottomSheet
            jogador={selectedPlayer}
            zones={allZones.map(z => ({
              id: z,
              label: zoneLabels[z],
              color: zoneColors[z],
              disabled: z === selectedZone,
            }))}
            onMove={handleMoveFromSheet}
            onClose={() => {
              setSelectedPlayer(null)
              setSelectedZone(null)
            }}
          />
        )}
      </>
    )
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
