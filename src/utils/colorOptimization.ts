'use client'

import { ScheduleCategory } from '@/types'

// 色の事前計算キャッシュ
const colorCache = new Map<string, {
  base: string
  light: string
  dark: string
  darker: string
  opacity: Record<number, string>
  contrast: string
}>()

/**
 * 色のバリエーションを事前計算してキャッシュ
 */
export function precomputeColors(categories: ScheduleCategory[]) {
  categories.forEach(category => {
    if (!colorCache.has(category.color)) {
      const variants = computeColorVariants(category.color)
      colorCache.set(category.color, variants)
    }
  })
}

/**
 * 色のバリエーションを計算（重い処理）
 */
function computeColorVariants(baseColor: string) {
  // RGB値を取得
  const rgb = hexToRgb(baseColor)
  if (!rgb) return getDefaultColorVariants()

  // 明度・彩度の調整で各バリエーションを生成
  const light = lighten(rgb, 0.2)
  const dark = darken(rgb, 0.2)
  const darker = darken(rgb, 0.4)
  
  // 透明度バリエーション
  const opacity = {
    10: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
    20: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
    30: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
    50: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
    70: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`,
    90: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`
  }

  // コントラスト色の計算
  const contrast = getContrastColor(rgb)

  return {
    base: rgbToHex(rgb),
    light: rgbToHex(light),
    dark: rgbToHex(dark),
    darker: rgbToHex(darker),
    opacity,
    contrast
  }
}

/**
 * キャッシュから色バリエーションを取得
 */
export function getCachedColorVariants(color: string) {
  return colorCache.get(color) || getDefaultColorVariants()
}

/**
 * デフォルトの色バリエーション
 */
function getDefaultColorVariants() {
  return {
    base: '#6B7280',
    light: '#9CA3AF',
    dark: '#4B5563',
    darker: '#374151',
    opacity: {
      10: 'rgba(107, 114, 128, 0.1)',
      20: 'rgba(107, 114, 128, 0.2)',
      30: 'rgba(107, 114, 128, 0.3)',
      50: 'rgba(107, 114, 128, 0.5)',
      70: 'rgba(107, 114, 128, 0.7)',
      90: 'rgba(107, 114, 128, 0.9)'
    },
    contrast: '#FFFFFF'
  }
}

/**
 * HEXからRGBに変換
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * RGBからHEXに変換
 */
function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  return `#${Math.round(rgb.r).toString(16).padStart(2, '0')}${Math.round(rgb.g).toString(16).padStart(2, '0')}${Math.round(rgb.b).toString(16).padStart(2, '0')}`
}

/**
 * 色を明るくする
 */
function lighten(rgb: { r: number; g: number; b: number }, factor: number) {
  return {
    r: Math.min(255, rgb.r + (255 - rgb.r) * factor),
    g: Math.min(255, rgb.g + (255 - rgb.g) * factor),
    b: Math.min(255, rgb.b + (255 - rgb.b) * factor)
  }
}

/**
 * 色を暗くする
 */
function darken(rgb: { r: number; g: number; b: number }, factor: number) {
  return {
    r: Math.max(0, rgb.r * (1 - factor)),
    g: Math.max(0, rgb.g * (1 - factor)),
    b: Math.max(0, rgb.b * (1 - factor))
  }
}

/**
 * コントラスト色を計算
 */
function getContrastColor(rgb: { r: number; g: number; b: number }): string {
  // 輝度を計算
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

/**
 * パフォーマンス統計を取得
 */
export function getColorCacheStats() {
  return {
    size: colorCache.size,
    keys: Array.from(colorCache.keys()),
    memoryEstimate: colorCache.size * 0.5 // 概算（KB）
  }
}

/**
 * キャッシュをクリア
 */
export function clearColorCache() {
  colorCache.clear()
} 