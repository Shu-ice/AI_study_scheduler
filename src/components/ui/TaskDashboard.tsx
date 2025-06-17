'use client'

import { useMemo } from 'react'
import { format, isToday, isThisWeek, isPast, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Task, TaskPriority, TaskStatus } from '@/types'
import TaskAnalysisPanel from '@/components/tasks/TaskAnalysisPanel'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar,
  TrendingUp,
  Target,
  Plus,
  ArrowRight,
  PieChart
} from 'lucide-react'

interface TaskDashboardProps {
  tasks: Task[]
  onCreateTask: () => void
  onTaskCreate: (tasks: Partial<Task>[]) => void
  onViewAllTasks: () => void
  onTaskClick: (task: Task) => void
  className?: string
}

interface TaskStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  overdue: number
  dueToday: number
  dueThisWeek: number
  highPriority: number
  completionRate: number
  averageDuration: number
}

export default function TaskDashboard({
  tasks,
  onCreateTask,
  onTaskCreate,
  onViewAllTasks,
  onTaskClick,
  className = ''
}: TaskDashboardProps) {
  
  // タスク統計を計算
  const stats: TaskStats = useMemo(() => {
    const total = tasks.length
    const pending = tasks.filter(t => t.status === 'pending').length
    const inProgress = tasks.filter(t => t.status === 'in-progress').length
    const completed = tasks.filter(t => t.status === 'completed').length
    const cancelled = tasks.filter(t => t.status === 'cancelled').length
    
    const today = startOfDay(new Date())
    const overdue = tasks.filter(t => 
      t.deadline && 
      isPast(new Date(t.deadline)) && 
      !isToday(new Date(t.deadline)) && 
      t.status !== 'completed'
    ).length
    
    const dueToday = tasks.filter(t => 
      t.deadline && isToday(new Date(t.deadline)) && t.status !== 'completed'
    ).length
    
    const dueThisWeek = tasks.filter(t => 
      t.deadline && 
      isThisWeek(new Date(t.deadline)) && 
      t.status !== 'completed' &&
      !isToday(new Date(t.deadline))
    ).length
    
    const highPriority = tasks.filter(t => 
      t.priority === 'high' && t.status !== 'completed'
    ).length
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    
    const activeTasks = tasks.filter(t => t.status !== 'cancelled')
    const averageDuration = activeTasks.length > 0 
      ? Math.round(activeTasks.reduce((sum, t) => sum + t.estimatedDuration, 0) / activeTasks.length)
      : 0

    return {
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      overdue,
      dueToday,
      dueThisWeek,
      highPriority,
      completionRate,
      averageDuration
    }
  }, [tasks])

  // 緊急タスク（今日期限 + 期限切れ + 高優先度）
  const urgentTasks = useMemo(() => {
    return tasks
      .filter(task => {
        if (task.status === 'completed' || task.status === 'cancelled') return false
        
        const hasDeadlineToday = task.deadline && isToday(new Date(task.deadline))
        const isOverdue = task.deadline && isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline))
        const isHighPriority = task.priority === 'high'
        
        return hasDeadlineToday || isOverdue || isHighPriority
      })
      .sort((a, b) => {
        // 期限切れ > 今日期限 > 高優先度の順
        const aIsOverdue = a.deadline && isPast(new Date(a.deadline)) && !isToday(new Date(a.deadline))
        const bIsOverdue = b.deadline && isPast(new Date(b.deadline)) && !isToday(new Date(b.deadline))
        const aIsToday = a.deadline && isToday(new Date(a.deadline))
        const bIsToday = b.deadline && isToday(new Date(b.deadline))
        
        if (aIsOverdue && !bIsOverdue) return -1
        if (!aIsOverdue && bIsOverdue) return 1
        if (aIsToday && !bIsToday) return -1
        if (!aIsToday && bIsToday) return 1
        
        // 優先度でソート
        const priorityWeight = { high: 3, medium: 2, low: 1 }
        return priorityWeight[b.priority] - priorityWeight[a.priority]
      })
      .slice(0, 5) // 上位5件
  }, [tasks])

  // 推定時間をフォーマット
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
    }
    return `${mins}分`
  }

  // タスクの緊急度を判定
  const getTaskUrgency = (task: Task) => {
    if (task.deadline && isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline))) {
      return { level: 'overdue', label: '期限切れ', color: 'text-red-600 bg-red-100' }
    }
    if (task.deadline && isToday(new Date(task.deadline))) {
      return { level: 'today', label: '今日期限', color: 'text-orange-600 bg-orange-100' }
    }
    if (task.priority === 'high') {
      return { level: 'high', label: '高優先度', color: 'text-purple-600 bg-purple-100' }
    }
    return { level: 'normal', label: '通常', color: 'text-gray-600 bg-gray-100' }
  }

  // 統計カード
  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    color = 'blue',
    trend 
  }: {
    icon: any
    title: string
    value: string | number
    subtitle?: string
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
    trend?: { value: number; isPositive: boolean }
  }) => {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      red: 'text-red-600 bg-red-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      purple: 'text-purple-600 bg-purple-100'
    }

    return (
      <div className="bg-white rounded-lg border p-6 hover:shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          {trend && (
            <div className={`flex items-center text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`w-4 h-4 mr-1 ${
                trend.isPositive ? '' : 'transform rotate-180'
              }`} />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">タスクダッシュボード</h1>
          <p className="text-gray-600 mt-1">
            {format(new Date(), 'yyyy年M月d日 (E)', { locale: ja })}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCreateTask}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            新しいタスク
          </button>
          <button
            onClick={onViewAllTasks}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            すべて表示
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      {/* 統計概要 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          title="総タスク数"
          value={stats.total}
          subtitle={`完了: ${stats.completed}件`}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          title="完了率"
          value={`${stats.completionRate}%`}
          subtitle={`${stats.completed}/${stats.total}件`}
          color="green"
        />
        <StatCard
          icon={AlertTriangle}
          title="緊急タスク"
          value={stats.overdue + stats.dueToday + stats.highPriority}
          subtitle={`期限切れ: ${stats.overdue}件`}
          color="red"
        />
        <StatCard
          icon={Clock}
          title="平均時間"
          value={formatDuration(stats.averageDuration)}
          subtitle="推定作業時間"
          color="purple"
        />
      </div>

      {/* プログレスバー */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">進捗状況</h3>
          <span className="text-sm text-gray-500">{stats.completed}/{stats.total}件完了</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full" />
            <span className="text-gray-600">未着手: {stats.pending}件</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-gray-600">進行中: {stats.inProgress}件</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-600">完了: {stats.completed}件</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-gray-600">キャンセル: {stats.cancelled}件</span>
          </div>
        </div>
      </div>

      {/* 緊急タスク */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              緊急タスク
            </h3>
            {urgentTasks.length > 5 && (
              <button
                onClick={onViewAllTasks}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                すべて表示
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          {urgentTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">緊急タスクはありません</p>
              <p className="text-sm text-gray-500 mt-1">素晴らしい！すべてのタスクが順調です</p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentTasks.map(task => {
                const urgency = getTaskUrgency(task)
                
                return (
                  <div
                    key={task.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {task.title}
                          </h4>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${urgency.color}`}>
                            {urgency.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: task.category.color }}
                            />
                            {task.category.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(task.estimatedDuration)}
                          </div>
                          {task.deadline && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(task.deadline), 'M/d', { locale: ja })}
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI タスク解析パネル */}
      <TaskAnalysisPanel
        onTaskCreate={onTaskCreate}
        existingTasks={tasks}
        className="lg:col-span-2"
      />

      {/* 今週の予定 */}
      {stats.dueThisWeek > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            今週の予定
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.dueToday}</p>
              <p className="text-sm text-blue-700">今日期限</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{stats.dueThisWeek}</p>
              <p className="text-sm text-yellow-700">今週期限</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{stats.highPriority}</p>
              <p className="text-sm text-purple-700">高優先度</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 