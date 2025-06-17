// ユーザー関連の型定義
export interface User {
  id: string
  email: string
  name: string
  preferences?: UserPreferences
  createdAt: Date
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  language: 'ja' | 'en'
  timeFormat: '12h' | '24h'
  weekStartDay: 0 | 1 // 0: Sunday, 1: Monday
}

// スケジュール関連の型定義
export interface Schedule {
  id: string
  userId: string
  title: string
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  date: Date
  category: ScheduleCategory
  isFixed: boolean
  repeatPattern?: RepeatPattern
  color?: string
  description?: string
  createdAt: Date
  updatedAt: Date
  // ドラッグ&ドロップ用
  isDragging?: boolean
  tempStartTime?: string
  tempEndTime?: string
}

export interface ScheduleCategory {
  id: string
  userId: string
  name: string
  color: string
  icon?: string
}

export interface RepeatPattern {
  type: 'daily' | 'weekly' | 'weekdays' | 'custom'
  interval: number
  endDate?: Date
  exceptions?: Date[]
  customDays?: number[] // 0-6 (Sunday-Saturday) for custom pattern
}

// タスク関連の型定義
export interface Task {
  id: string
  userId: string
  title: string
  description?: string
  estimatedDuration: number // minutes
  priority: TaskPriority
  deadline?: Date
  category: ScheduleCategory
  status: TaskStatus
  createdAt: Date
  updatedAt: Date
}

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled'

// 実績記録関連の型定義
export interface ActualRecord {
  id: string
  scheduleId: string
  actualStartTime: string
  actualEndTime: string
  notes?: string
  satisfactionRating?: number // 1-5
  createdAt: Date
}

// カレンダー関連の型定義
export interface TimeSlot {
  hour: number
  minute: number
  display: string // "09:00"
  index?: number // スロットのインデックス
}

// 時間密度設定
export type TimeInterval = 15 | 30 | 60

// カレンダー設定
export interface CalendarSettings {
  timeInterval: TimeInterval // 時間間隔（分）
  startHour: number // 開始時刻
  endHour: number // 終了時刻
  autoHeight: boolean // 自動高さ調整
  showOverlapping: boolean // 重複スケジュール表示
}

// スケジュール重複情報
export interface ScheduleOverlap {
  scheduleId: string
  column: number // 表示列（0-based）
  totalColumns: number // 総列数
  width: number // 幅の割合（0-1）
}

export interface CalendarDay {
  date: Date
  dayOfWeek: number // 0-6
  isToday: boolean
  isWeekend: boolean
  schedules: Schedule[]
  overlaps?: Map<string, ScheduleOverlap> // スケジュール重複情報
}

export interface CalendarWeek {
  startDate: Date
  endDate: Date
  days: CalendarDay[]
}

// AIチャット関連の型定義
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    suggestedTask?: Partial<Task>
    suggestedSchedule?: Partial<Schedule>
  }
}

export interface TaskSuggestion {
  task: Partial<Task>
  suggestedTimeSlots: {
    date: Date
    startTime: string
    endTime: string
    confidence: number
  }[]
  reasoning: string
}

// AI API関連の拡張型定義
export interface AIConfig {
  model: 'gpt-4o' | 'gpt-4o-mini'
  maxTokens: number
  temperature: number
  timeout: number
}

export interface AIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    model: string
    tokens: number
    duration: number
  }
}

export interface AIError extends Error {
  code: string
  type: 'api_error' | 'rate_limit' | 'timeout' | 'invalid_request' | 'unknown'
  statusCode?: number
  retryAfter?: number
}

export interface ChatRequest {
  message: string
  conversationId?: string
  context?: {
    tasks?: Task[]
    schedules?: Schedule[]
  }
}

export interface TaskAnalysisRequest {
  taskDescription: string
  existingTasks?: Task[]
  deadline?: string
  preferences?: {
    preferredHours?: string[]
    workdays?: number[]
    breakDuration?: number
  }
}

export interface TaskAnalysisResponse {
  suggestedTasks: TaskSuggestion[]
  insights: string[]
  estimatedEffort: {
    total: number // minutes
    breakdown: { task: string; duration: number }[]
  }
}

export interface ScheduleSuggestionRequest {
  tasks: Task[]
  availableSlots: TimeSlot[]
  preferences?: SchedulePreferences
  constraints?: {
    mustFinishBy?: Date
    noWorkAfter?: string
    minimumBreaks?: number
  }
}

export interface SchedulePreferences {
  preferredStartTime: string
  preferredEndTime: string
  breakDuration: number
  focusBlockDuration: number
  allowWeekends: boolean
}

export interface ScheduleSuggestionResponse {
  suggestedSchedules: {
    schedule: Partial<Schedule>
    score: number
    reasoning: string
  }[]
  conflicts: {
    task: string
    issue: string
    suggestions: string[]
  }[]
  summary: {
    totalHours: number
    efficiency: number
    stress: number
  }
}

// AI使用状況とパフォーマンス
export interface AIUsageStats {
  requestCount: number
  totalTokens: number
  averageResponseTime: number
  errorRate: number
  lastUsed: Date
}

// 計画・実績比較分析関連の型定義
export interface AnalyticsRequest {
  startDate: string
  endDate: string
  periodType: 'day' | 'week' | 'month' | 'custom'
  includeCategories?: string[]
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary
  timeComparison: TimeComparisonData[]
  completionRate: CompletionRateData
  satisfactionTrend: SatisfactionTrendData[]
  categoryBreakdown: CategoryAnalyticsData[]
  efficiencyMetrics: EfficiencyMetrics
  insights: string[]
}

export interface AnalyticsSummary {
  totalPlannedHours: number
  totalActualHours: number
  completedSchedules: number
  totalSchedules: number
  averageSatisfaction: number
  efficiencyRate: number // 実績時間/計画時間の平均
}

export interface TimeComparisonData {
  date: string
  plannedMinutes: number
  actualMinutes: number
  difference: number // actual - planned
  completionRate: number // 0-100
}

export interface CompletionRateData {
  completed: number
  inProgress: number
  notStarted: number
  cancelled: number
  total: number
  completionPercentage: number
}

export interface SatisfactionTrendData {
  date: string
  averageSatisfaction: number
  scheduleCount: number
}

export interface CategoryAnalyticsData {
  categoryId: string
  categoryName: string
  color: string
  plannedMinutes: number
  actualMinutes: number
  completedCount: number
  totalCount: number
  averageSatisfaction: number
  efficiencyRate: number
}

export interface EfficiencyMetrics {
  timeEfficiency: number // 計画通りに実行できた割合
  overrunPercentage: number // 予定より長くかかった予定の割合
  underrunPercentage: number // 予定より短く終わった予定の割合
  averageOverrun: number // 平均オーバー時間（分）
  averageUnderrun: number // 平均短縮時間（分）
  mostEfficientCategory: string | null
  leastEfficientCategory: string | null
}

// 分析フィルター用の型
export interface AnalyticsFilter {
  period: 'today' | 'week' | 'month' | 'custom'
  startDate?: Date
  endDate?: Date
  categories?: string[]
  includeWeekends?: boolean
  minSatisfaction?: number
}