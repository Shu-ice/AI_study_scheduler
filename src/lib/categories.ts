import { ScheduleCategory } from '@/types'
import { generateRandomColor, getCategoryColor, isValidHexColor } from './colors'

export const DEFAULT_CATEGORIES = [
  { name: '仕事', color: '#3b82f6', icon: '💼' },
  { name: '学習', color: '#22c55e', icon: '📚' },
  { name: 'プライベート', color: '#ec4899', icon: '🏠' },
  { name: '健康', color: '#ef4444', icon: '💪' },
  { name: '会議', color: '#8b5cf6', icon: '📞' },
] as const

export function createDefaultCategory(
  name: string,
  userId: string,
  customColor?: string
): Omit<ScheduleCategory, 'id'> {
  const defaultCategory = DEFAULT_CATEGORIES.find(cat => cat.name === name)
  
  return {
    userId,
    name,
    color: customColor && isValidHexColor(customColor) 
      ? customColor 
      : defaultCategory?.color || getCategoryColor(name) || generateRandomColor(),
    icon: defaultCategory?.icon,
  }
}

export function validateCategoryData(data: Partial<ScheduleCategory>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data.name || data.name.trim().length === 0) {
    errors.push('カテゴリ名は必須です')
  }

  if (data.name && data.name.trim().length > 50) {
    errors.push('カテゴリ名は50文字以内で入力してください')
  }

  if (!data.color || !isValidHexColor(data.color)) {
    errors.push('有効な色を指定してください')
  }

  if (!data.userId || data.userId.trim().length === 0) {
    errors.push('ユーザーIDは必須です')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function sanitizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function isDuplicateCategory(
  newName: string,
  existingCategories: ScheduleCategory[],
  excludeId?: string
): boolean {
  const normalizedNewName = sanitizeCategoryName(newName).toLowerCase()
  
  return existingCategories.some(category => {
    if (excludeId && category.id === excludeId) return false
    return sanitizeCategoryName(category.name).toLowerCase() === normalizedNewName
  })
}

export function sortCategoriesAlphabetically(categories: ScheduleCategory[]): ScheduleCategory[] {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

export function sortCategoriesByUsage(
  categories: ScheduleCategory[],
  usageCount: Record<string, number>
): ScheduleCategory[] {
  return [...categories].sort((a, b) => {
    const countA = usageCount[a.id] || 0
    const countB = usageCount[b.id] || 0
    
    if (countA !== countB) {
      return countB - countA // 使用回数の多い順
    }
    
    return a.name.localeCompare(b.name, 'ja') // 同じ使用回数なら名前順
  })
}

export function searchCategories(
  categories: ScheduleCategory[],
  query: string
): ScheduleCategory[] {
  if (!query.trim()) return categories

  const normalizedQuery = query.toLowerCase().trim()
  
  return categories.filter(category =>
    category.name.toLowerCase().includes(normalizedQuery)
  )
}

export function getCategoryStats(
  categories: ScheduleCategory[],
  schedules: { categoryId: string }[]
): {
  categoryId: string
  name: string
  color: string
  usageCount: number
  percentage: number
}[] {
  const usageCount = schedules.reduce((acc, schedule) => {
    acc[schedule.categoryId] = (acc[schedule.categoryId] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalSchedules = schedules.length

  return categories.map(category => ({
    categoryId: category.id,
    name: category.name,
    color: category.color,
    usageCount: usageCount[category.id] || 0,
    percentage: totalSchedules > 0 ? ((usageCount[category.id] || 0) / totalSchedules) * 100 : 0
  }))
}

export function getUnusedCategories(
  categories: ScheduleCategory[],
  schedules: { categoryId: string }[]
): ScheduleCategory[] {
  const usedCategoryIds = new Set(schedules.map(s => s.categoryId))
  return categories.filter(category => !usedCategoryIds.has(category.id))
}

export function canDeleteCategory(
  categoryId: string,
  schedules: { categoryId: string }[]
): { canDelete: boolean; reason?: string } {
  const isUsed = schedules.some(schedule => schedule.categoryId === categoryId)
  
  if (isUsed) {
    return {
      canDelete: false,
      reason: 'このカテゴリは既にスケジュールで使用されているため削除できません'
    }
  }
  
  return { canDelete: true }
}