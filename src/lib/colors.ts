export const PRESET_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#6b7280', // gray-500
  '#1f2937', // gray-800
] as const

export const CATEGORY_COLORS = {
  work: '#3b82f6',      // blue-500
  study: '#22c55e',     // green-500
  personal: '#ec4899',  // pink-500
  health: '#ef4444',    // red-500
  meeting: '#8b5cf6',   // violet-500
  default: '#6b7280',   // gray-500
} as const

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }).join("")
}

export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

export function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return '#000000'
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
  return brightness > 128 ? '#000000' : '#ffffff'
}

export function lightenColor(hexColor: string, percent: number): string {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return hexColor
  
  const amount = Math.round(2.55 * percent)
  const r = Math.min(255, rgb.r + amount)
  const g = Math.min(255, rgb.g + amount)
  const b = Math.min(255, rgb.b + amount)
  
  return rgbToHex(r, g, b)
}

export function darkenColor(hexColor: string, percent: number): string {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return hexColor
  
  const amount = Math.round(2.55 * percent)
  const r = Math.max(0, rgb.r - amount)
  const g = Math.max(0, rgb.g - amount)
  const b = Math.max(0, rgb.b - amount)
  
  return rgbToHex(r, g, b)
}

export function getColorWithOpacity(hexColor: string, opacity: number): string {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return hexColor
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
}

export function generateRandomColor(): string {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
}

export function getCategoryColor(categoryName: string): string {
  const normalizedName = categoryName.toLowerCase()
  return CATEGORY_COLORS[normalizedName as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.default
}

export function createColorVariants(baseColor: string) {
  return {
    base: baseColor,
    light: lightenColor(baseColor, 20),
    lighter: lightenColor(baseColor, 40),
    dark: darkenColor(baseColor, 20),
    darker: darkenColor(baseColor, 40),
    opacity: {
      10: getColorWithOpacity(baseColor, 0.1),
      20: getColorWithOpacity(baseColor, 0.2),
      30: getColorWithOpacity(baseColor, 0.3),
      50: getColorWithOpacity(baseColor, 0.5),
      70: getColorWithOpacity(baseColor, 0.7),
      90: getColorWithOpacity(baseColor, 0.9),
    },
    contrast: getContrastColor(baseColor),
  }
}