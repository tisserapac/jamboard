import { create } from 'zustand'

export interface Board {
  id: string
  title: string
  thumbnail: string | null
  created_at: string
  updated_at: string
}

export interface Frame {
  id: string
  board_id: string
  frame_order: number
  title: string | null
  background_color: string
  background_template: string | null
  canvas_json: string | null
  created_at: string
  updated_at: string
}

interface BoardState {
  boards: Board[]
  currentBoard: Board | null
  frames: Frame[]
  activeFrameId: string | null
  setBoards: (boards: Board[]) => void
  setCurrentBoard: (board: Board | null) => void
  setFrames: (frames: Frame[]) => void
  setActiveFrameId: (id: string | null) => void
}

export const useBoardStore = create<BoardState>((set) => ({
  boards: [],
  currentBoard: null,
  frames: [],
  activeFrameId: null,
  setBoards: (boards) => set({ boards }),
  setCurrentBoard: (board) => set({ currentBoard: board }),
  setFrames: (frames) => set({ frames }),
  setActiveFrameId: (id) => set({ activeFrameId: id })
}))
