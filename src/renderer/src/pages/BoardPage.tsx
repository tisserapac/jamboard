import { useEffect, useCallback, useRef } from 'react'
import { useBoardStore, type Frame } from '../stores/boardStore'
import WhiteboardCanvas from '../components/canvas/WhiteboardCanvas'
import Toolbar from '../components/toolbar/Toolbar'

interface BoardPageProps {
  boardId: string
  onBack: () => void
}

function BoardPage({ boardId, onBack }: BoardPageProps): JSX.Element {
  const { currentBoard, setCurrentBoard, frames, setFrames, activeFrameId, setActiveFrameId } =
    useBoardStore()
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasJsonRef = useRef<string | null>(null)

  useEffect(() => {
    loadBoard()
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [boardId])

  async function loadBoard(): Promise<void> {
    const board = await window.api.boards.get(boardId)
    if (board) setCurrentBoard(board)

    const frameList = await window.api.frames.list(boardId)
    setFrames(frameList)

    if (frameList.length > 0) {
      setActiveFrameId(frameList[0].id)
    }
  }

  const activeFrame = frames.find((f) => f.id === activeFrameId) || null

  const handleCanvasChange = useCallback(
    (canvasJson: string) => {
      canvasJsonRef.current = canvasJson
      if (!activeFrameId) return

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(async () => {
        if (canvasJsonRef.current && activeFrameId) {
          await window.api.frames.updateCanvas(activeFrameId, canvasJsonRef.current)
        }
      }, 1000)
    },
    [activeFrameId]
  )

  async function handleBack(): Promise<void> {
    // Save current state before leaving
    if (activeFrameId && canvasJsonRef.current) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      await window.api.frames.updateCanvas(activeFrameId, canvasJsonRef.current)
    }
    setCurrentBoard(null)
    setFrames([])
    setActiveFrameId(null)
    onBack()
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Top bar */}
      <header className="bg-white border-b px-4 py-2 flex items-center gap-4 h-12">
        <button
          onClick={handleBack}
          className="p-1 hover:bg-gray-100 rounded text-gray-600"
          title="Back to dashboard"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-sm font-medium text-gray-700 truncate">
          {currentBoard?.title || 'Loading...'}
        </h2>
        <div className="flex-1" />
        <span className="text-xs text-gray-400">Auto-saved</span>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        <Toolbar />

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-gray-200 p-4">
          {activeFrame ? (
            <WhiteboardCanvas
              key={activeFrame.id}
              frame={activeFrame}
              onCanvasChange={handleCanvasChange}
            />
          ) : (
            <div className="text-gray-400">Loading...</div>
          )}
        </div>

        {/* Frame sidebar */}
        <FrameSidebar
          frames={frames}
          activeFrameId={activeFrameId}
          onSelectFrame={async (id) => {
            // Save current before switching
            if (activeFrameId && canvasJsonRef.current) {
              if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
              await window.api.frames.updateCanvas(activeFrameId, canvasJsonRef.current)
            }
            canvasJsonRef.current = null
            setActiveFrameId(id)
          }}
          onAddFrame={async () => {
            const frame = await window.api.frames.create(boardId)
            const frameList = await window.api.frames.list(boardId)
            setFrames(frameList)
            setActiveFrameId(frame.id)
          }}
          onDeleteFrame={async (id) => {
            if (frames.length <= 1) return
            await window.api.frames.delete(id)
            const frameList = await window.api.frames.list(boardId)
            setFrames(frameList)
            if (activeFrameId === id && frameList.length > 0) {
              setActiveFrameId(frameList[0].id)
            }
          }}
        />
      </div>
    </div>
  )
}

// Frame sidebar component
interface FrameSidebarProps {
  frames: Frame[]
  activeFrameId: string | null
  onSelectFrame: (id: string) => void
  onAddFrame: () => void
  onDeleteFrame: (id: string) => void
}

function FrameSidebar({
  frames,
  activeFrameId,
  onSelectFrame,
  onAddFrame,
  onDeleteFrame
}: FrameSidebarProps): JSX.Element {
  return (
    <div className="w-48 bg-white border-l flex flex-col">
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase">Frames</span>
        <button
          onClick={onAddFrame}
          className="p-1 hover:bg-gray-100 rounded text-gray-500 text-sm"
          title="Add frame"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {frames.map((frame, index) => (
          <div
            key={frame.id}
            className={`relative cursor-pointer rounded-lg border-2 transition-colors ${
              frame.id === activeFrameId
                ? 'border-blue-500'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => onSelectFrame(frame.id)}
          >
            <div
              className="h-24 rounded-md flex items-center justify-center text-xs text-gray-400"
              style={{ backgroundColor: frame.background_color || '#FFFFFF' }}
            >
              {index + 1}
            </div>
            {frames.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteFrame(frame.id)
                }}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                title="Delete frame"
              >
                x
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default BoardPage
