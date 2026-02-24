interface ColorPickerProps {
  colors: string[]
  activeColor: string
  onColorChange: (color: string) => void
}

function ColorPicker({ colors, activeColor, onColorChange }: ColorPickerProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1 items-center">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onColorChange(c)}
          className={`w-6 h-6 rounded-full border-2 transition-transform ${
            activeColor === c ? 'border-blue-500 scale-110' : 'border-gray-200'
          }`}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  )
}

export default ColorPicker
