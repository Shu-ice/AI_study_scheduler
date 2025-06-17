import { Task } from '@/types'
import { isAfter, isBefore, startOfDay } from 'date-fns'

// タスクデータのバリデーション
export function validateTaskData(data: {
  title?: string
  description?: string
  estimatedDuration?: number | string
  priority?: string
  deadline?: string | Date | null
  categoryId?: string
  userId?: string
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // タイトルのバリデーション
  if (!data.title || data.title.trim().length === 0) {
    errors.push('タイトルは必須です')
  } else if (data.title.trim().length > 100) {
    errors.push('タイトルは100文字以内で入力してください')
  }

  // 説明のバリデーション
  if (data.description && data.description.length > 500) {
    errors.push('説明は500文字以内で入力してください')
  }

  // 推定時間のバリデーション
  if (data.estimatedDuration !== undefined) {
    const duration = typeof data.estimatedDuration === 'string' 
      ? parseInt(data.estimatedDuration)
      : data.estimatedDuration
    
    if (isNaN(duration) || duration < 1 || duration > 1440) {
      errors.push('推定時間は1-1440分の範囲で入力してください')
    }
  }

  // 優先度のバリデーション
  if (data.priority) {
    const validPriorities = ['low', 'medium', 'high']
    if (!validPriorities.includes(data.priority.toLowerCase())) {
      errors.push('優先度はlow、medium、highのいずれかを指定してください')
    }
  }

  // 期限のバリデーション
  if (data.deadline && data.deadline !== null) {
    const deadline = new Date(data.deadline)
    if (isNaN(deadline.getTime())) {
      errors.push('期限の形式が無効です')
    }
  }

  // カテゴリIDのバリデーション
  if (data.categoryId && data.categoryId.trim().length === 0) {
    errors.push('カテゴリIDは必須です')
  }

  // ユーザーIDのバリデーション
  if (data.userId && data.userId.trim().length === 0) {
    errors.push('ユーザーIDは必須です')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// 全体進捗の計算
export function calculateTaskProgress(tasks: Task[]): {
  total: number
  completed: number
  inProgress: number
  pending: number
  cancelled: number
  completionRate: number
} {
  const total = tasks.length
  const completed = tasks.filter(task => task.status === 'completed').length
  const inProgress = tasks.filter(task => task.status === 'in-progress').length
  const pending = tasks.filter(task => task.status === 'pending').length
  const cancelled = tasks.filter(task => task.status === 'cancelled').length

  const completionRate = total > 0 ? (completed / total) * 100 : 0

  return {
    total,
    completed,
    inProgress,
    pending,
    cancelled,
    completionRate: Math.round(completionRate * 100) / 100
  }
}

// 期限切れタスクの検出
export function getOverdueTasks(tasks: Task[]): Task[] {
  const now = startOfDay(new Date())
  
  return tasks.filter(task => {
    if (!task.deadline || task.status === 'completed' || task.status === 'cancelled') {
      return false
    }
    
    return isBefore(startOfDay(new Date(task.deadline)), now)
  })
}

// 期限による自動優先度調整の提案
export function prioritizeTasksByDeadline(tasks: Task[]): {
  task: Task
  suggestedPriority: 'high' | 'medium' | 'low'
  reason: string
}[] {
  const now = new Date()
  const suggestions: {
    task: Task
    suggestedPriority: 'high' | 'medium' | 'low'
    reason: string
  }[] = []

  tasks.forEach(task => {
    if (!task.deadline || task.status === 'completed' || task.status === 'cancelled') {
      return
    }

    const deadline = new Date(task.deadline)
    const timeDiff = deadline.getTime() - now.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

    let suggestedPriority: 'high' | 'medium' | 'low'
    let reason: string

    if (daysDiff < 0) {
      // 期限切れ
      suggestedPriority = 'high'
      reason = '期限が過ぎています'
    } else if (daysDiff <= 1) {
      // 1日以内
      suggestedPriority = 'high'
      reason = '期限まで1日以内です'
    } else if (daysDiff <= 3) {
      // 3日以内
      suggestedPriority = 'medium'
      reason = '期限まで3日以内です'
    } else if (daysDiff <= 7) {
      // 1週間以内
      suggestedPriority = 'medium'
      reason = '期限まで1週間以内です'
    } else {
      // 1週間より先
      suggestedPriority = 'low'
      reason = '期限まで余裕があります'
    }

    // 現在の優先度と異なる場合のみ提案
    if (task.priority !== suggestedPriority) {
      suggestions.push({
        task,
        suggestedPriority,
        reason
      })
    }
  })

  return suggestions
}

// 推定時間の表示フォーマット
export function formatTaskDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours}時間`
  }

  return `${hours}時間${remainingMinutes}分`
}

// タスクのソート
export function sortTasks(
  tasks: Task[],
  sortBy: 'priority' | 'deadline' | 'created' | 'status' | 'title',
  sortOrder: 'asc' | 'desc' = 'asc'
): Task[] {
  return [...tasks].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
        break

      case 'deadline':
        const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity
        const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity
        comparison = aDeadline - bDeadline
        break

      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break

      case 'status':
        const statusOrder = { pending: 1, 'in-progress': 2, completed: 3, cancelled: 4 }
        comparison = statusOrder[a.status] - statusOrder[b.status]
        break

      case 'title':
        comparison = a.title.localeCompare(b.title, 'ja')
        break

      default:
        return 0
    }

    return sortOrder === 'desc' ? -comparison : comparison
  })
}

// タスクのフィルタリング
export function filterTasks(
  tasks: Task[],
  filters: {
    status?: string[]
    priority?: string[]
    categoryId?: string
    hasDeadline?: boolean
    overdue?: boolean
    search?: string
  }
): Task[] {
  return tasks.filter(task => {
    // ステータスフィルター
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(task.status)) {
        return false
      }
    }

    // 優先度フィルター
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(task.priority)) {
        return false
      }
    }

    // カテゴリフィルター
    if (filters.categoryId) {
      if (task.category.id !== filters.categoryId) {
        return false
      }
    }

    // 期限有無フィルター
    if (filters.hasDeadline !== undefined) {
      const hasDeadline = !!task.deadline
      if (hasDeadline !== filters.hasDeadline) {
        return false
      }
    }

    // 期限切れフィルター
    if (filters.overdue) {
      const overdueTasks = getOverdueTasks([task])
      if (overdueTasks.length === 0) {
        return false
      }
    }

    // テキスト検索フィルター
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim()
      const matchesTitle = task.title.toLowerCase().includes(searchTerm)
      const matchesDescription = task.description?.toLowerCase().includes(searchTerm) || false
      
      if (!matchesTitle && !matchesDescription) {
        return false
      }
    }

    return true
  })
}

// タスク統計の計算
export function calculateTaskStatistics(tasks: Task[]): {
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  byCategory: Record<string, { count: number; categoryName: string }>
  averageDuration: number
  totalEstimatedTime: number
  overdueCount: number
} {
  const byStatus: Record<string, number> = {}
  const byPriority: Record<string, number> = {}
  const byCategory: Record<string, { count: number; categoryName: string }> = {}
  
  let totalDuration = 0
  const overdueTasks = getOverdueTasks(tasks)

  tasks.forEach(task => {
    // ステータス別
    byStatus[task.status] = (byStatus[task.status] || 0) + 1

    // 優先度別
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1

    // カテゴリ別
    const categoryId = task.category.id
    if (!byCategory[categoryId]) {
      byCategory[categoryId] = {
        count: 0,
        categoryName: task.category.name
      }
    }
    byCategory[categoryId].count++

    // 時間集計
    totalDuration += task.estimatedDuration
  })

  return {
    byStatus,
    byPriority,
    byCategory,
    averageDuration: tasks.length > 0 ? Math.round(totalDuration / tasks.length) : 0,
    totalEstimatedTime: totalDuration,
    overdueCount: overdueTasks.length
  }
}