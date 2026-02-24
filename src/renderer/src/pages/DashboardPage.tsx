import { useEffect, useState } from 'react'
import { useBoardStore, type Board } from '../stores/boardStore'

interface DashboardPageProps {
  onOpenBoard: (id: string) => void
}

function DashboardPage({ onOpenBoard }: DashboardPageProps): JSX.Element {
  const { boards, setBoards } = useBoardStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    loadBoards()
  }, [])

  async function loadBoards(): Promise<void> {
    const result = await window.api.boards.list()
    setBoards(result)
  }

  async function handleCreate(): Promise<void> {
    const board = await window.api.boards.create(newTitle || 'Untitled Jam')
    setNewTitle('')
    setIsCreating(false)
    await loadBoards()
    onOpenBoard(board.id)
  }

  async function handleDelete(id: string): Promise<void> {
    await window.api.boards.delete(id)
    await loadBoards()
  }

  async function handleRename(id: string): Promise<void> {
    if (!editTitle.trim()) return
    await window.api.boards.update(id, { title: editTitle })
    setEditingId(null)
    await loadBoards()
  }

  async function handleDuplicate(id: string): Promise<void> {
    await window.api.boards.duplicate(id)
    await loadBoards()
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'Z')
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Jamboard</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Jam
        </button>
      </header>

      {/* Create Dialog */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Create New Jam</h2>
            <input
              type="text"
              placeholder="Enter a title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setIsCreating(false); setNewTitle('') }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board Grid */}
      <div className="flex-1 overflow-auto p-6">
        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-lg">No jams yet</p>
            <p className="text-sm">Click &quot;+ New Jam&quot; to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map((board: Board) => (
              <div
                key={board.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer group"
              >
                {/* Thumbnail */}
                <div
                  className="h-40 bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden"
                  onClick={() => onOpenBoard(board.id)}
                >
                  {board.thumbnail ? (
                    <img
                      src={board.thumbnail}
                      alt={board.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  {editingId === board.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(board.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={() => handleRename(board.id)}
                      className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <h3
                      className="font-medium text-gray-800 truncate"
                      onDoubleClick={() => {
                        setEditingId(board.id)
                        setEditTitle(board.title)
                      }}
                    >
                      {board.title}
                    </h3>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(board.updated_at)}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(board.id)
                        setEditTitle(board.title)
                      }}
                      className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                      title="Rename"
                    >
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDuplicate(board.id)
                      }}
                      className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                      title="Duplicate"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete "${board.title}"?`)) {
                          handleDelete(board.id)
                        }
                      }}
                      className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
