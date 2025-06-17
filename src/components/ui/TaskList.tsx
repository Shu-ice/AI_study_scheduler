'use client'

import { useState, useMemo } from 'react'
import { format, isToday, isThisWeek, isPast } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Task, TaskPriority, TaskStatus } from '@/types'
import { ChevronDown, Clock, Calendar, Plus, Search, Filter, MoreVertical, CheckCircle, Circle, PlayCircle, XCircle } from 'lucide-react'

interface TaskListProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void
  onTaskDelete: (taskId: string) => void
  onCreateTask: () => void
  loading?: boolean
  className?: string
}

type SortOption = 'deadline' | 'priority' | 'status' | 'created' | 'title'
type FilterOption = 'all' | 'today' | 'thisWeek' | 'overdue' | 'high-priority'

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; weight: number }> = {
  high: { label: '高', color: 'text-red-600 bg-red-100', weight: 3 },
  medium: { label: '中', color: 'text-yellow-600 bg-yellow-100', weight: 2 },
  low: { label: '低', color: 'text-green-600 bg-green-100', weight: 1 }
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: any }> = {
  pending: { label: '未着手', color: 'text-gray-600 bg-gray-100', icon: Circle },
  'in-progress': { label: '進行中', color: 'text-blue-600 bg-blue-100', icon: PlayCircle },
  completed: { label: '完了', color: 'text-green-600 bg-green-100', icon: CheckCircle },
  cancelled: { label: 'キャンセル', color: 'text-red-600 bg-red-100', icon: XCircle }
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'deadline', label: '期限順' },
  { value: 'priority', label: '優先度順' },
  { value: 'status', label: 'ステータス順' },
  { value: 'created', label: '作成日順' },
  { value: 'title', label: 'タイトル順' }
]

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'today', label: '今日まで' },
  { value: 'thisWeek', label: '今週まで' },
  { value: 'overdue', label: '期限切れ' },
  { value: 'high-priority', label: '高優先度' }
]

export default function TaskList({
  tasks,
  onTaskClick,
  onTaskStatusChange,
  onTaskDelete,
  onCreateTask,
  loading = false,
  className = ''
}: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('deadline')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>(['pending', 'in-progress'])
  const [showCompletedTasks, setShowCompletedTasks] = useState(false)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  // タスクをフィルタリング
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // 検索クエリでフィルタ
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = task.title.toLowerCase().includes(query)
        const matchesDescription = task.description?.toLowerCase().includes(query)
        const matchesCategory = task.category.name.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription && !matchesCategory) {
          return false
        }
      }

      // ステータスでフィルタ
      if (!showCompletedTasks && task.status === 'completed') {
        return false
      }
      if (!selectedStatuses.includes(task.status)) {
        return false
      }

      // 日付/優先度フィルタ
      switch (filterBy) {
        case 'today':
          return task.deadline ? isToday(new Date(task.deadline)) || isPast(new Date(task.deadline)) : false
        case 'thisWeek':
          return task.deadline ? isThisWeek(new Date(task.deadline)) || isPast(new Date(task.deadline)) : false
        case 'overdue':
          return task.deadline ? isPast(new Date(task.deadline)) && task.status !== 'completed' : false
        case 'high-priority':
          return task.priority === 'high'
        case 'all':
        default:
          return true
      }
    })

    return filtered
  }, [tasks, searchQuery, filterBy, selectedStatuses, showCompletedTasks])

  // タスクをソート
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks].sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          if (!a.deadline && !b.deadline) return 0
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        
        case 'priority':
          return PRIORITY_CONFIG[b.priority].weight - PRIORITY_CONFIG[a.priority].weight
        
        case 'status':
          const statusOrder = ['pending', 'in-progress', 'completed', 'cancelled']
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
        
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        
        case 'title':
          return a.title.localeCompare(b.title, 'ja')
        
        default:
          return 0
      }
    })

    return sorted
  }, [filteredTasks, sortBy])

  // ステータス切り替え
  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    onTaskStatusChange(taskId, newStatus)
  }

  // 推定時間をフォーマット
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours}h${mins}m` : `${hours}h`
    }
    return `${mins}m`
  }

  // 期限の表示とスタイル
  const getDeadlineDisplay = (deadline?: Date) => {
    if (!deadline) return null

    const date = new Date(deadline)
    const isOverdue = isPast(date) && !isToday(date)
    const isTodayTask = isToday(date)

    let dateString = format(date, 'M/d', { locale: ja })
    let colorClass = 'text-gray-600'

    if (isOverdue) {
      colorClass = 'text-red-600 font-medium'
      dateString += ' (期限切れ)'
    } else if (isTodayTask) {
      colorClass = 'text-orange-600 font-medium'
      dateString = '今日'
    }

    return { dateString, colorClass, isOverdue, isTodayTask }
  }

  // ステータス変更メニュー
  const StatusMenu = ({ task }: { task: Task }) => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="ステータス変更"
        >
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
              <div className="py-1">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                  const Icon = config.icon
                  return (
                    <button
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStatusChange(task.id, status as TaskStatus)
                        setIsOpen(false)
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                        task.status === status ? 'bg-gray-50' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {config.label}
                      {task.status === status && (
                        <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                      )}
                    </button>
                  )
                })}
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onTaskDelete(task.id)
                    setIsOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  削除
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ヘッダーとコントロール */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-blue-600" />
            タスク管理
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({sortedTasks.length}件)
            </span>
          </h2>
          <button
            onClick={onCreateTask}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            新しいタスク
          </button>
        </div>

        {/* 検索とフィルター */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 検索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="タスクを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* ソート */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* フィルター */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              {FILTER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ステータスフィルター */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const isSelected = selectedStatuses.includes(status as TaskStatus)
            return (
              <button
                key={status}
                onClick={() => {
                  if (isSelected) {
                    setSelectedStatuses(prev => prev.filter(s => s !== status))
                  } else {
                    setSelectedStatuses(prev => [...prev, status as TaskStatus])
                  }
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  isSelected 
                    ? config.color 
                    : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {config.label}
              </button>
            )
          })}
          <button
            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              showCompletedTasks 
                ? 'text-green-600 bg-green-100' 
                : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            完了済み表示
          </button>
        </div>
      </div>

      {/* タスクリスト */}
      <div className="space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || filterBy !== 'all' ? 'タスクが見つかりません' : 'タスクがありません'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterBy !== 'all' 
                ? '検索条件を変更してみてください' 
                : '新しいタスクを作成しましょう'
              }
            </p>
            {(!searchQuery && filterBy === 'all') && (
              <button
                onClick={onCreateTask}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                最初のタスクを作成
              </button>
            )}
          </div>
        ) : (
          sortedTasks.map(task => {
            const deadlineInfo = getDeadlineDisplay(task.deadline)
            const StatusIcon = STATUS_CONFIG[task.status].icon
            const isExpanded = expandedTask === task.id

            return (
              <div
                key={task.id}
                className="bg-white rounded-lg border hover:shadow-sm transition-all cursor-pointer"
                onClick={() => onTaskClick(task)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* ステータスアイコン */}
                    <div className="flex-shrink-0 mt-0.5">
                      <StatusIcon className={`w-5 h-5 ${STATUS_CONFIG[task.status].color.split(' ')[0]}`} />
                    </div>

                    {/* メインコンテンツ */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {task.title}
                          </h3>
                          
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* メタデータ */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {/* カテゴリー */}
                            <div className="flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: task.category.color }}
                              />
                              {task.category.name}
                            </div>

                            {/* 推定時間 */}
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(task.estimatedDuration)}
                            </div>

                            {/* 期限 */}
                            {deadlineInfo && (
                              <div className={`flex items-center gap-1 ${deadlineInfo.colorClass}`}>
                                <Calendar className="w-3 h-3" />
                                {deadlineInfo.dateString}
                              </div>
                            )}

                            {/* 優先度 */}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CONFIG[task.priority].color}`}>
                              {PRIORITY_CONFIG[task.priority].label}
                            </span>
                          </div>
                        </div>

                        {/* アクションメニュー */}
                        <div className="flex-shrink-0">
                          <StatusMenu task={task} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 展開された詳細情報 */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">作成日:</span>
                          <span className="ml-2 text-gray-600">
                            {format(new Date(task.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">更新日:</span>
                          <span className="ml-2 text-gray-600">
                            {format(new Date(task.updatedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}