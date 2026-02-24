import { create } from 'zustand'

export type ToolType = 'select' | 'pen' | 'highlighter' | 'eraser' | 'shape' | 'text' | 'sticky' | 'laser'

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle'

export const COLORS = [
  '#000000', // Black
  '#FF0000', // Red
  '#0000FF', // Blue
  '#00AA00', // Green
  '#FF8800', // Orange
  '#8800FF'  // Purple
]

export const STICKY_COLORS = [
  '#FFF176', // Yellow
  '#A5D6A7', // Green
  '#90CAF9', // Blue
  '#F48FB1', // Pink
  '#CE93D8', // Purple
  '#FFCC80'  // Orange
]

interface ToolState {
  activeTool: ToolType
  color: string
  brushSize: number
  opacity: number
  shapeType: ShapeType
  setTool: (tool: ToolType) => void
  setColor: (color: string) => void
  setBrushSize: (size: number) => void
  setOpacity: (opacity: number) => void
  setShapeType: (shape: ShapeType) => void
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'pen',
  color: '#000000',
  brushSize: 3,
  opacity: 1,
  shapeType: 'rectangle',
  setTool: (tool) => set({ activeTool: tool }),
  setColor: (color) => set({ color }),
  setBrushSize: (size) => set({ brushSize: size }),
  setOpacity: (opacity) => set({ opacity }),
  setShapeType: (shape) => set({ shapeType: shape })
}))
