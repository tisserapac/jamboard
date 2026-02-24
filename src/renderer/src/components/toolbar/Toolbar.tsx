import { useToolStore, COLORS, type ToolType } from '../../stores/toolStore'
import ColorPicker from './ColorPicker'
import BrushSizeSlider from './BrushSizeSlider'

const tools: Array<{ id: ToolType; label: string; icon: string }> = [
  { id: 'select', label: 'Select', icon: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z' },
  { id: 'pen', label: 'Pen', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
  { id: 'highlighter', label: 'Highlight', icon: 'M7 21h10m-5-18v4m-6.364 1.636l2.828 2.828M4 12h4m12 0h-4m-1.636-6.364l-2.828 2.828M12 17v4' },
  { id: 'eraser', label: 'Eraser', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
  { id: 'shape', label: 'Shapes', icon: 'M4 6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V6z M14 14v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2a2 2 0 00-2 2z' },
  { id: 'text', label: 'Text', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { id: 'sticky', label: 'Sticky', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }
]

function Toolbar(): JSX.Element {
  const { activeTool, setTool, color, setColor, brushSize, setBrushSize } = useToolStore()

  const showBrushOptions = activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser'

  return (
    <div className="w-16 bg-white border-r flex flex-col items-center py-3 gap-1">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setTool(tool.id)}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
            activeTool === tool.id
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
          title={tool.label}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.icon} />
          </svg>
        </button>
      ))}

      {/* Divider */}
      <div className="w-8 h-px bg-gray-200 my-2" />

      {/* Color picker */}
      <ColorPicker
        colors={COLORS}
        activeColor={color}
        onColorChange={setColor}
      />

      {/* Brush size */}
      {showBrushOptions && (
        <>
          <div className="w-8 h-px bg-gray-200 my-2" />
          <BrushSizeSlider
            size={brushSize}
            onSizeChange={setBrushSize}
          />
        </>
      )}
    </div>
  )
}

export default Toolbar
