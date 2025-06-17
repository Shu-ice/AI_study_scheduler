'use client'

import { useState, useRef } from 'react'
import { Sparkles, Brain, Clock, AlertTriangle, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { TaskAnalysisRequest, Task } from '@/types'

interface TaskAnalysisResponse {
  suggestedTasks: {
    title: string
    description?: string
    estimatedDuration: number
    priority: string
    categoryId?: string
    categoryName?: string
  }[]
  insights: string[]
  estimatedEffort: {
    total: number
    breakdown: { task: string; duration: number }[]
  }
}

interface TaskAnalysisPanelProps {
  onTaskCreate?: (tasks: Partial<Task>[]) => void
  existingTasks?: Task[]
  className?: string
}

interface AnalysisState {
  loading: boolean
  response: TaskAnalysisResponse | null
  error: string | null
}

export default function TaskAnalysisPanel({ 
  onTaskCreate, 
  existingTasks = [], 
  className = '' 
}: TaskAnalysisPanelProps) {
  const [input, setInput] = useState('')
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    loading: false,
    response: null,
    error: null
  })
  const [expandedInsights, setExpandedInsights] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleAnalyze = async () => {
    if (!input.trim() || analysisState.loading) return

    setAnalysisState({
      loading: true,
      response: null,
      error: null
    })

    try {
             const requestData: TaskAnalysisRequest = {
         taskDescription: input.trim(),
         existingTasks: existingTasks,
         preferences: {
           preferredHours: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
           workdays: [1, 2, 3, 4, 5], // 月-金
           breakDuration: 15
         }
       }

      const response = await fetch('/api/ai/task-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'タスク分析に失敗しました')
      }

      const data: TaskAnalysisResponse = await response.json()
      
      setAnalysisState({
        loading: false,
        response: data,
        error: null
      })

      // デフォルトで全てのタスクを選択
      setSelectedTasks(new Set(data.suggestedTasks.map((_, index) => index)))

    } catch (error) {
      setAnalysisState({
        loading: false,
        response: null,
        error: error instanceof Error ? error.message : 'エラーが発生しました'
      })
    }
  }

  const handleTaskSelect = (index: number) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedTasks(newSelected)
  }

  const handleCreateTasks = () => {
    if (!analysisState.response || !onTaskCreate) return

    const tasksToCreate = analysisState.response.suggestedTasks
      .filter((_, index) => selectedTasks.has(index))
      .map(task => ({
        title: task.title,
        description: task.description,
        estimatedDuration: task.estimatedDuration,
        priority: task.priority as 'low' | 'medium' | 'high',
        categoryId: task.categoryId
      }))

    onTaskCreate(tasksToCreate)
    
    // リセット
    setInput('')
    setAnalysisState({ loading: false, response: null, error: null })
    setSelectedTasks(new Set())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAnalyze()
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return '普通'
    }
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      <div className="p-4 border-b">
        <div className="flex items-center mb-3">
          <Brain className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            自然言語タスク解析
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="タスクを自然な言葉で入力してください...&#10;例: 「算数の宿題 60分」「プレゼン資料作成 明日の会議用」「英語の勉強 TOEIC対策 2時間」"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              Cmd/Ctrl + Enter で解析
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!input.trim() || analysisState.loading}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {analysisState.loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                解析中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                タスクを解析
              </>
            )}
          </button>
        </div>
      </div>

      {analysisState.error && (
        <div className="p-4 border-b bg-red-50">
          <div className="flex items-center text-red-700">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span className="text-sm">{analysisState.error}</span>
          </div>
        </div>
      )}

      {analysisState.response && (
        <div className="p-4">
          <div className="space-y-4">
            {/* 提案されたタスク */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">提案されたタスク</h4>
                <span className="text-sm text-gray-500">
                  {selectedTasks.size} / {analysisState.response.suggestedTasks.length} 選択
                </span>
              </div>

              <div className="space-y-3">
                {analysisState.response.suggestedTasks.map((task, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedTasks.has(index) 
                        ? 'border-purple-300 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTaskSelect(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(index)}
                            onChange={() => handleTaskSelect(index)}
                            className="mr-2 text-purple-600"
                          />
                          <h5 className="font-medium text-gray-900">{task.title}</h5>
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {task.estimatedDuration}分
                          </div>
                          <div className={`px-2 py-1 rounded border text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {getPriorityLabel(task.priority)}優先度
                          </div>
                          {task.categoryName && (
                            <div className="text-gray-500">
                              カテゴリ: {task.categoryName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* インサイト */}
            {analysisState.response.insights.length > 0 && (
              <div>
                <button
                  onClick={() => setExpandedInsights(!expandedInsights)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h4 className="font-medium text-gray-900">AIからの提案</h4>
                  {expandedInsights ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                
                {expandedInsights && (
                  <div className="mt-2 space-y-2">
                    {analysisState.response.insights.map((insight, index) => (
                      <div key={index} className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                        {insight}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 作業時間の見積もり */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">作業時間の見積もり</h4>
              <div className="text-sm text-gray-600">
                <div>合計時間: <span className="font-medium">{analysisState.response.estimatedEffort.total}分</span></div>
                {analysisState.response.estimatedEffort.breakdown.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {analysisState.response.estimatedEffort.breakdown.map((item, index) => (
                      <div key={index} className="text-xs">
                        • {item.task}: {item.duration}分
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreateTasks}
                disabled={selectedTasks.size === 0}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                選択したタスクを作成 ({selectedTasks.size})
              </button>
              
              <button
                onClick={() => {
                  setInput('')
                  setAnalysisState({ loading: false, response: null, error: null })
                  setSelectedTasks(new Set())
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 