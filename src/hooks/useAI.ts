'use client'

import { useState, useCallback, useRef } from 'react'
import { 
  ChatRequest, 
  TaskAnalysisRequest, 
  TaskAnalysisResponse,
  ScheduleSuggestionRequest, 
  ScheduleSuggestionResponse,
  AIUsageStats 
} from '@/types'
import { getErrorMessage } from '@/lib/ai-error-handler'

interface UseAIProps {
  onError?: (error: string) => void
  onSuccess?: (response: any) => void
  autoRetry?: boolean
  maxRetries?: number
}

interface AIState {
  loading: boolean
  error: string | null
  lastResponse: any
  usageStats: Partial<AIUsageStats>
}

export function useAI({
  onError,
  onSuccess,
  autoRetry = true,
  maxRetries = 2
}: UseAIProps = {}) {
  const [state, setState] = useState<AIState>({
    loading: false,
    error: null,
    lastResponse: null,
    usageStats: {}
  })

  const abortController = useRef<AbortController | null>(null)

  // 共通のAPI呼び出し処理
  const callAPI = useCallback(async (
    endpoint: string,
    data: any,
    requestId?: string
  ) => {
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null 
    }))

    // 既存のリクエストがあればキャンセル
    if (abortController.current) {
      abortController.current.abort()
    }
    
    abortController.current = new AbortController()

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: abortController.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      
      setState(prev => ({
        ...prev,
        loading: false,
        lastResponse: result,
        usageStats: {
          ...prev.usageStats,
          lastUsed: new Date()
        }
      }))

      onSuccess?.(result)
      return result

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // リクエストがキャンセルされた場合は何もしない
        return null
      }

      let errorMessage = error.message || 'AI APIでエラーが発生しました'
      
      // エラーメッセージの正規化
      if (error.message.includes('rate limit') || error.message.includes('制限')) {
        errorMessage = 'API使用量の制限に達しました。しばらくお待ちください。'
      } else if (error.message.includes('timeout') || error.message.includes('タイムアウト')) {
        errorMessage = '処理に時間がかかっています。再度お試しください。'
      } else if (error.message.includes('401') || error.message.includes('認証')) {
        errorMessage = '認証に失敗しました。ログインし直してください。'
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))

      onError?.(errorMessage)
      throw new Error(errorMessage)
    }
  }, [onError, onSuccess])

  // チャット機能
  const chat = useCallback(async (
    message: string,
    conversationId?: string,
    context?: ChatRequest['context']
  ) => {
    const requestData: ChatRequest = {
      message,
      conversationId,
      context
    }

    return callAPI('/api/ai/chat', requestData, `chat_${Date.now()}`)
  }, [callAPI])

  // タスク分析機能
  const analyzeTask = useCallback(async (
    taskDescription: string,
    options?: Omit<TaskAnalysisRequest, 'taskDescription'>
  ): Promise<TaskAnalysisResponse | null> => {
    const requestData: TaskAnalysisRequest = {
      taskDescription,
      ...options
    }

    return callAPI('/api/ai/task-analysis', requestData, `analysis_${Date.now()}`)
  }, [callAPI])

  // スケジュール提案機能
  const suggestSchedule = useCallback(async (
    tasks: ScheduleSuggestionRequest['tasks'],
    availableSlots: ScheduleSuggestionRequest['availableSlots'],
    options?: Pick<ScheduleSuggestionRequest, 'preferences' | 'constraints'>
  ): Promise<ScheduleSuggestionResponse | null> => {
    const requestData: ScheduleSuggestionRequest = {
      tasks,
      availableSlots,
      ...options
    }

    return callAPI('/api/ai/schedule-suggestion', requestData, `schedule_${Date.now()}`)
  }, [callAPI])

  // リクエストのキャンセル
  const cancelRequest = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'リクエストがキャンセルされました'
      }))
    }
  }, [])

  // エラーのクリア
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // ステートのリセット
  const reset = useCallback(() => {
    cancelRequest()
    setState({
      loading: false,
      error: null,
      lastResponse: null,
      usageStats: {}
    })
  }, [cancelRequest])

  // 再試行機能
  const retry = useCallback(async () => {
    if (state.lastResponse) {
      clearError()
      // 最後のリクエストを再実行（実装は省略、必要に応じて詳細化）
    }
  }, [state.lastResponse, clearError])

  return {
    // ステート
    loading: state.loading,
    error: state.error,
    lastResponse: state.lastResponse,
    usageStats: state.usageStats,

    // API呼び出し
    chat,
    analyzeTask,
    suggestSchedule,

    // ユーティリティ
    cancelRequest,
    clearError,
    reset,
    retry,

    // ヘルパー
    isLoading: state.loading,
    hasError: !!state.error,
    hasResponse: !!state.lastResponse
  }
}

// 複数のAI機能を管理するコンポジットフック
export function useAIManager() {
  const [activeRequests, setActiveRequests] = useState<Set<string>>(new Set())
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [globalStats, setGlobalStats] = useState<Partial<AIUsageStats>>({})

  const handleError = useCallback((error: string, requestId?: string) => {
    setGlobalError(error)
    if (requestId) {
      setActiveRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }, [])

  const handleSuccess = useCallback((response: any, requestId?: string) => {
    setGlobalError(null)
    if (requestId) {
      setActiveRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
    
    // 使用統計を更新
    setGlobalStats(prev => ({
      ...prev,
      requestCount: (prev.requestCount || 0) + 1,
      lastUsed: new Date()
    }))
  }, [])

  const startRequest = useCallback((requestId: string) => {
    setActiveRequests(prev => new Set(prev).add(requestId))
  }, [])

  const chatAI = useAI({ 
    onError: (error) => handleError(error, 'chat'),
    onSuccess: (response) => handleSuccess(response, 'chat')
  })

  const taskAI = useAI({ 
    onError: (error) => handleError(error, 'task'),
    onSuccess: (response) => handleSuccess(response, 'task')
  })

  const scheduleAI = useAI({ 
    onError: (error) => handleError(error, 'schedule'),
    onSuccess: (response) => handleSuccess(response, 'schedule')
  })

  return {
    // 個別のAI機能
    chat: chatAI,
    task: taskAI,
    schedule: scheduleAI,

    // グローバル状態
    isAnyLoading: chatAI.loading || taskAI.loading || scheduleAI.loading,
    globalError,
    activeRequestCount: activeRequests.size,
    globalStats,

    // グローバル操作
    clearAllErrors: () => {
      setGlobalError(null)
      chatAI.clearError()
      taskAI.clearError()
      scheduleAI.clearError()
    },
    
    cancelAllRequests: () => {
      chatAI.cancelRequest()
      taskAI.cancelRequest()
      scheduleAI.cancelRequest()
      setActiveRequests(new Set())
    },

    resetAll: () => {
      chatAI.reset()
      taskAI.reset()
      scheduleAI.reset()
      setActiveRequests(new Set())
      setGlobalError(null)
      setGlobalStats({})
    }
  }
}