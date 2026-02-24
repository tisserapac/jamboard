import { useEffect, useRef, useCallback } from 'react'
import * as fabric from 'fabric'
import { useToolStore, STICKY_COLORS } from '../../stores/toolStore'
import type { Frame } from '../../stores/boardStore'

interface WhiteboardCanvasProps {
  frame: Frame
  onCanvasChange: (canvasJson: string) => void
}

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 540

function WhiteboardCanvas({ frame, onCanvasChange }: WhiteboardCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const isLoadingRef = useRef(false)
  const undoStackRef = useRef<string[]>([])
  const redoStackRef = useRef<string[]>([])

  const { activeTool, color, brushSize, shapeType } = useToolStore()

  // Notify parent of changes
  const emitChange = useCallback(() => {
    if (isLoadingRef.current || !fabricRef.current) return
    const json = JSON.stringify(fabricRef.current.toJSON())
    onCanvasChange(json)
  }, [onCanvasChange])

  // Save state for undo
  const saveUndoState = useCallback(() => {
    if (isLoadingRef.current || !fabricRef.current) return
    const json = JSON.stringify(fabricRef.current.toJSON())
    undoStackRef.current.push(json)
    if (undoStackRef.current.length > 50) undoStackRef.current.shift()
    redoStackRef.current = []
  }, [])

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: frame.background_color || '#FFFFFF',
      selection: true
    })

    fabricRef.current = canvas

    // Load existing canvas data
    if (frame.canvas_json) {
      isLoadingRef.current = true
      try {
        const json = JSON.parse(frame.canvas_json)
        canvas.loadFromJSON(json).then(() => {
          canvas.renderAll()
          isLoadingRef.current = false
        })
      } catch {
        isLoadingRef.current = false
      }
    }

    // Event listeners for changes
    const handleModified = (): void => {
      saveUndoState()
      emitChange()
    }

    canvas.on('object:modified', handleModified)
    canvas.on('object:added', () => {
      if (!isLoadingRef.current) {
        saveUndoState()
        emitChange()
      }
    })
    canvas.on('object:removed', () => {
      if (!isLoadingRef.current) {
        emitChange()
      }
    })
    canvas.on('path:created', () => {
      if (!isLoadingRef.current) {
        saveUndoState()
        emitChange()
      }
    })

    return () => {
      canvas.dispose()
      fabricRef.current = null
    }
  }, [frame.id])

  // Handle tool changes
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    // Reset canvas mode
    canvas.isDrawingMode = false
    canvas.selection = false
    canvas.defaultCursor = 'default'
    canvas.forEachObject((obj) => {
      obj.selectable = false
      obj.evented = false
    })

    switch (activeTool) {
      case 'select':
        canvas.selection = true
        canvas.defaultCursor = 'default'
        canvas.forEachObject((obj) => {
          obj.selectable = true
          obj.evented = true
        })
        break

      case 'pen':
        canvas.isDrawingMode = true
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
        canvas.freeDrawingBrush.color = color
        canvas.freeDrawingBrush.width = brushSize
        break

      case 'highlighter':
        canvas.isDrawingMode = true
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
        canvas.freeDrawingBrush.color = color + '60' // 38% opacity via hex alpha
        canvas.freeDrawingBrush.width = brushSize * 3
        break

      case 'eraser':
        canvas.defaultCursor = 'crosshair'
        setupEraserEvents(canvas)
        break

      case 'shape':
        canvas.defaultCursor = 'crosshair'
        setupShapeEvents(canvas, shapeType, color)
        break

      case 'text':
        canvas.defaultCursor = 'text'
        setupTextEvents(canvas, color)
        break

      case 'sticky':
        canvas.defaultCursor = 'crosshair'
        setupStickyEvents(canvas)
        break
    }

    canvas.renderAll()
  }, [activeTool, color, brushSize, shapeType])

  // Update brush properties when color/size changes during drawing mode
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !canvas.isDrawingMode || !canvas.freeDrawingBrush) return

    if (activeTool === 'pen') {
      canvas.freeDrawingBrush.color = color
      canvas.freeDrawingBrush.width = brushSize
    } else if (activeTool === 'highlighter') {
      canvas.freeDrawingBrush.color = color + '60'
      canvas.freeDrawingBrush.width = brushSize * 3
    }
  }, [color, brushSize, activeTool])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const canvas = fabricRef.current
      if (!canvas) return

      // Delete selected objects
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = canvas.getActiveObjects()
        if (activeObjects.length > 0) {
          saveUndoState()
          activeObjects.forEach((obj) => canvas.remove(obj))
          canvas.discardActiveObject()
          canvas.renderAll()
          emitChange()
        }
      }

      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (undoStackRef.current.length > 0) {
          const currentState = JSON.stringify(canvas.toJSON())
          redoStackRef.current.push(currentState)
          const prevState = undoStackRef.current.pop()!
          isLoadingRef.current = true
          canvas.loadFromJSON(JSON.parse(prevState)).then(() => {
            canvas.renderAll()
            isLoadingRef.current = false
            emitChange()
          })
        }
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault()
        if (redoStackRef.current.length > 0) {
          const currentState = JSON.stringify(canvas.toJSON())
          undoStackRef.current.push(currentState)
          const nextState = redoStackRef.current.pop()!
          isLoadingRef.current = true
          canvas.loadFromJSON(JSON.parse(nextState)).then(() => {
            canvas.renderAll()
            isLoadingRef.current = false
            emitChange()
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveUndoState, emitChange])

  return (
    <div className="shadow-lg rounded-lg overflow-hidden">
      <canvas ref={canvasRef} />
    </div>
  )
}

// --- Tool event setup functions ---

function setupEraserEvents(canvas: fabric.Canvas): void {
  let isErasing = false

  const onMouseDown = (): void => {
    isErasing = true
  }

  const onMouseMove = (opt: fabric.TPointerEventInfo): void => {
    if (!isErasing) return
    const pointer = canvas.getScenePoint(opt.e)
    const objects = canvas.getObjects()
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]
      if (obj.containsPoint(pointer)) {
        canvas.remove(obj)
        break
      }
    }
  }

  const onMouseUp = (): void => {
    isErasing = false
  }

  canvas.on('mouse:down', onMouseDown)
  canvas.on('mouse:move', onMouseMove)
  canvas.on('mouse:up', onMouseUp)

  // Store cleanup functions
  const cleanup = (): void => {
    canvas.off('mouse:down', onMouseDown)
    canvas.off('mouse:move', onMouseMove)
    canvas.off('mouse:up', onMouseUp)
  }
  ;(canvas as unknown as Record<string, unknown>).__eraserCleanup = cleanup
}

function setupShapeEvents(
  canvas: fabric.Canvas,
  shapeType: string,
  color: string
): void {
  let isDrawing = false
  let startX = 0
  let startY = 0
  let shape: fabric.FabricObject | null = null

  const onMouseDown = (opt: fabric.TPointerEventInfo): void => {
    isDrawing = true
    const pointer = canvas.getScenePoint(opt.e)
    startX = pointer.x
    startY = pointer.y

    switch (shapeType) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: color,
          strokeWidth: 2
        })
        break
      case 'circle':
        shape = new fabric.Ellipse({
          left: startX,
          top: startY,
          rx: 0,
          ry: 0,
          fill: 'transparent',
          stroke: color,
          strokeWidth: 2
        })
        break
      case 'line':
        shape = new fabric.Line([startX, startY, startX, startY], {
          stroke: color,
          strokeWidth: 2
        })
        break
      case 'triangle':
        shape = new fabric.Triangle({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: color,
          strokeWidth: 2
        })
        break
    }

    if (shape) {
      canvas.add(shape)
    }
  }

  const onMouseMove = (opt: fabric.TPointerEventInfo): void => {
    if (!isDrawing || !shape) return
    const pointer = canvas.getScenePoint(opt.e)
    const width = pointer.x - startX
    const height = pointer.y - startY

    if (shape instanceof fabric.Rect || shape instanceof fabric.Triangle) {
      shape.set({
        width: Math.abs(width),
        height: Math.abs(height),
        left: width < 0 ? pointer.x : startX,
        top: height < 0 ? pointer.y : startY
      })
    } else if (shape instanceof fabric.Ellipse) {
      shape.set({
        rx: Math.abs(width) / 2,
        ry: Math.abs(height) / 2,
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y)
      })
    } else if (shape instanceof fabric.Line) {
      shape.set({ x2: pointer.x, y2: pointer.y })
    }

    canvas.renderAll()
  }

  const onMouseUp = (): void => {
    isDrawing = false
    shape = null
  }

  canvas.on('mouse:down', onMouseDown)
  canvas.on('mouse:move', onMouseMove)
  canvas.on('mouse:up', onMouseUp)
}

function setupTextEvents(canvas: fabric.Canvas, color: string): void {
  const onClick = (opt: fabric.TPointerEventInfo): void => {
    const pointer = canvas.getScenePoint(opt.e)
    const text = new fabric.IText('Type here', {
      left: pointer.x,
      top: pointer.y,
      fontSize: 20,
      fill: color,
      fontFamily: 'Arial'
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    text.enterEditing()
  }

  canvas.on('mouse:down', onClick)
}

function setupStickyEvents(canvas: fabric.Canvas): void {
  let stickyColorIndex = 0

  const onClick = (opt: fabric.TPointerEventInfo): void => {
    const pointer = canvas.getScenePoint(opt.e)
    const stickyColor = STICKY_COLORS[stickyColorIndex % STICKY_COLORS.length]
    stickyColorIndex++

    const rect = new fabric.Rect({
      width: 150,
      height: 150,
      fill: stickyColor,
      rx: 4,
      ry: 4,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.2)',
        blur: 8,
        offsetX: 2,
        offsetY: 2
      })
    })

    const text = new fabric.IText('Note', {
      fontSize: 16,
      fill: '#333333',
      fontFamily: 'Arial',
      textAlign: 'center',
      originX: 'center',
      originY: 'center'
    })

    const group = new fabric.Group([rect, text], {
      left: pointer.x - 75,
      top: pointer.y - 75
    })

    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.renderAll()
  }

  canvas.on('mouse:down', onClick)
}

export default WhiteboardCanvas
