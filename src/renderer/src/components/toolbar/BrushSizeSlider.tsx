interface BrushSizeSliderProps {
  size: number
  onSizeChange: (size: number) => void
}

function BrushSizeSlider({ size, onSizeChange }: BrushSizeSliderProps): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center"
        title={`Size: ${size}`}
      >
        <div
          className="rounded-full bg-white"
          style={{
            width: Math.min(size + 2, 20),
            height: Math.min(size + 2, 20)
          }}
        />
      </div>
      <input
        type="range"
        min={1}
        max={20}
        value={size}
        onChange={(e) => onSizeChange(Number(e.target.value))}
        className="w-12 h-1 -rotate-90 mt-6 mb-6 accent-blue-500"
        title={`Brush size: ${size}`}
      />
    </div>
  )
}

export default BrushSizeSlider
