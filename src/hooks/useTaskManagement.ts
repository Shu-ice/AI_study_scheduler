'use client'

import { useState, useEffect, useCallback } from 'react'
import { Task } from '@/types'
import { 
  calculateTaskProgress, 
  getOverdueTasks, 
  prioritizeTasksByDeadline,
  sortTasks,
  filterTasks,
  calculateTaskStatistics
} from '@/lib/taskUtils'

interface UseTaskManagementProps {
  initialFilters?: {
    status?: string[]
    priority?: string[]
    categoryId?: string
    hasDeadline?: boolean
    overdue?: boolean
    search?: string
  }
  autoRefresh?: boolean
  refreshInterval?: number
}

interface TaskFilters {
  status?: string[]
  priority?: string[]
  categoryId?: string
  hasDeadline?: boolean
  overdue?: boolean
  search?: string
}

export function useTaskManagement({
  initialFilters = {},
  autoRefresh = false,
  refreshInterval = 30000
}: UseTaskManagementProps = {}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TaskFilters>(initialFilters)
  const [sortBy, setSortBy] = useState<'priority' | 'deadline' | 'created' | 'status' | 'title'>('priority')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // タスク一覧取得
  const fetchTasks = useCallback(async (queryFilters?: TaskFilters) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (queryFilters?.status && queryFilters.status.length > 0) {
        params.append('status', queryFilters.status.join(','))
      }
      
      if (queryFilters?.priority && queryFilters.priority.length > 0) {
        params.append('priority', queryFilters.priority.join(','))
      }
      
      if (queryFilters?.categoryId) {
        params.append('categoryId', queryFilters.categoryId)
      }
      
      if (queryFilters?.overdue) {
        params.append('overdue', 'true')
      }

      const response = await fetch(`/api/tasks?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'タスクの取得に失敗しました')
      }

      const data = await response.json()
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  // タスク作成
  const createTask = useCallback(async (taskData: {
    title: string
    description?: string
    estimatedDuration: number
    priority: 'low' | 'medium' | 'high'
    deadline?: Date | null
    categoryId: string
  }) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...taskData,
          deadline: taskData.deadline?.toISOString()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'タスクの作成に失敗しました')
      }

      const newTask = await response.json()
      setTasks(prev => [...prev, newTask])
      
      return newTask
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの作成に失敗しました')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // タスク更新
  const updateTask = useCallback(async (
    taskId: string, 
    updates: Partial<{
      title: string
      description: string
      estimatedDuration: number
      priority: 'low' | 'medium' | 'high'
      deadline: Date | null
      categoryId: string
      status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
    }>
  ) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          deadline: updates.deadline?.toISOString()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'タスクの更新に失敗しました')
      }

      const updatedTask = await response.json()
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ))
      
      return updatedTask
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの更新に失敗しました')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // タスク削除
  const deleteTask = useCallback(async (taskId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'タスクの削除に失敗しました')
      }

      setTasks(prev => prev.filter(task => task.id !== taskId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの削除に失敗しました')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // ステータス更新（クイックアクション用）
  const updateTaskStatus = useCallback(async (
    taskId: string, 
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  ) => {
    return updateTask(taskId, { status })
  }, [updateTask])

  // フィルター更新
  const updateFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // ソート更新
  const updateSort = useCallback((
    newSortBy: 'priority' | 'deadline' | 'created' | 'status' | 'title',
    newSortOrder?: 'asc' | 'desc'
  ) => {
    setSortBy(newSortBy)
    if (newSortOrder) {
      setSortOrder(newSortOrder)
    }
  }, [])

  // フィルターとソートの適用
  useEffect(() => {
    let result = tasks

    // フィルタリング
    if (Object.keys(filters).length > 0) {
      result = filterTasks(result, filters)
    }

    // ソート
    result = sortTasks(result, sortBy, sortOrder)

    setFilteredTasks(result)
  }, [tasks, sortBy, sortOrder])

  // 初回データ取得
  useEffect(() => {
    fetchTasks()
  }, [])

  // 自動リフレッシュ
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchTasks(filters)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, filters])

  // 計算済みデータ
  const progress = calculateTaskProgress(tasks)
  const overdueTasks = getOverdueTasks(tasks)
  const prioritySuggestions = prioritizeTasksByDeadline(tasks)
  const statistics = calculateTaskStatistics(tasks)

  return {
    // データ
    tasks: filteredTasks,
    allTasks: tasks,
    loading,
    error,
    
    // フィルターとソート
    filters,
    sortBy,
    sortOrder,
    updateFilters,
    updateSort,
    
    // CRUD操作
    fetchTasks: () => fetchTasks(filters),
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    
    // 計算済みデータ
    progress,
    overdueTasks,
    prioritySuggestions,
    statistics,
    
    // ユーティリティ
    clearError: () => setError(null),
  }
}