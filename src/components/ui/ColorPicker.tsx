'use client'

import { useState, useRef, useCallback } from 'react'
import { PRESET_COLORS, isValidHexColor, hexToRgb, rgbToHex } from '@/lib/colors'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  disabled?: boolean
  className?: string
}

export default function ColorPicker({
  value,
  onChange,
  label,
  disabled = false,
  className = ''
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePresetColorSelect = useCallback((color: string) => {
    onChange(color)
    setCustomColor(color)
    setIsOpen(false)
  }, [onChange])

  const handleCustomColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setCustomColor(newColor)
    if (isValidHexColor(newColor)) {
      onChange(newColor)
    }
  }, [onChange])

  const handleCustomColorBlur = useCallback(() => {
    if (!isValidHexColor(customColor)) {
      setCustomColor(value)
    }
  }, [customColor, value])

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="flex items-center space-x-2">
        {/* Color Preview Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-8 h-8 rounded-md border-2 border-gray-300 shadow-sm
            hover:border-gray-400 focus:outline-none focus:ring-2 
            focus:ring-blue-500 focus:border-blue-500
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          style={{ backgroundColor: isValidHexColor(value) ? value : '#6b7280' }}
          aria-label="カラーピッカーを開く"
        />

        {/* Custom Color Input */}
        <input
          ref={inputRef}
          type="text"
          value={customColor}
          onChange={handleCustomColorChange}
          onBlur={handleCustomColorBlur}
          disabled={disabled}
          placeholder="#000000"
          className={`
            flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
            font-mono text-sm
          `}
        />
      </div>

      {/* Color Picker Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              プリセットカラー
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handlePresetColorSelect(color)}
                  className={`
                    w-8 h-8 rounded-md border-2 hover:scale-110 transition-transform
                    ${value === color ? 'border-gray-800' : 'border-gray-300'}
                  `}
                  style={{ backgroundColor: color }}
                  aria-label={`色を選択: ${color}`}
                />
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              カスタムカラー
            </h4>
            <input
              type="color"
              value={isValidHexColor(customColor) ? customColor : '#6b7280'}
              onChange={(e) => {
                const newColor = e.target.value
                setCustomColor(newColor)
                onChange(newColor)
              }}
              className="w-full h-8 rounded border border-gray-300 cursor-pointer"
            />
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}