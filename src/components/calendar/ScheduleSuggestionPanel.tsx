'use client'

import { useState, useMemo } from 'react'
import { Calendar, Clock, Zap, AlertTriangle, Plus, Settings, TrendingUp } from 'lucide-react'
import { Task, Schedule, TimeSlot, ScheduleSuggestionRequest, ScheduleSuggestionResponse } from '@/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ScheduleSuggestionPanelProps {
  tasks: Task[]
  existingSchedules: Schedule[]
  onScheduleCreate?: (schedules: Partial<Schedule>[]) => void
  className?: string
}

interface SuggestionState {
  loading: boolean
  response: ScheduleSuggestionResponse | null
  error: string | null
}

interface SchedulePreferences {
  preferredStartTime: string
  preferredEndTime: string
  breakDuration: number
  focusBlockDuration: number
  allowWeekends: boolean
}

export default function ScheduleSuggestionPanel({ 
  tasks, 
  existingSchedules,
  onScheduleCreate,
  className = '' 
}: ScheduleSuggestionPanelProps) {
  const [suggestionState, setSuggestionState] = useState<SuggestionState>({
    loading: false,
    response: null,
    error: null
  })
  
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())
  const [showPreferences, setShowPreferences] = useState(false)
  
  const [preferences, setPreferences] = useState<SchedulePreferences>({
    preferredStartTime: '09:00',
    preferredEndTime: '18:00',
    breakDuration: 15,
    focusBlockDuration: 90,
    allowWeekends: false
  })

  // 未完了タスクのみフィルタリング
  const availableTasks = useMemo(() => {
    return tasks.filter(task => 
      task.status === 'pending' || task.status === 'in-progress'
    )
  }, [tasks])

  // 利用可能な時間枠を生成
  const generateAvailableSlots = useMemo(() => {
    const slots: TimeSlot[] = []
    const startHour = parseInt(preferences.preferredStartTime.split(':')[0])
    const endHour = parseInt(preferences.preferredEndTime.split(':')[0])
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push({
        hour,
        minute: 0,
        display: `${hour.toString().padStart(2, '0')}:00`
      })
      if (hour + 1 < endHour) {
        slots.push({
          hour,
          minute: 30,
          display: `${hour.toString().padStart(2, '0')}:30`
        })
      }
    }
    return slots
  }, [preferences.preferredStartTime, preferences.preferredEndTime])

  // スケジュール提案を生成
  const handleGenerateSuggestions = async () => {
    if (selectedTasks.size === 0) {
      setSuggestionState(prev => ({ ...prev, error: 'スケジュールに追加するタスクを選択してください' }))
      return
    }

    setSuggestionState({
      loading: true,
      response: null,
      error: null
    })

    try {
      const tasksToSchedule = availableTasks.filter(task => selectedTasks.has(task.id))
      
      const requestData: ScheduleSuggestionRequest = {
        tasks: tasksToSchedule,
        availableSlots: generateAvailableSlots,
        preferences,
        constraints: {
          mustFinishBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1週間後
          noWorkAfter: preferences.preferredEndTime,
          minimumBreaks: Math.floor(tasksToSchedule.length / 3)
        }
      }

      const response = await fetch('/api/ai/schedule-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'スケジュール提案の生成に失敗しました')
      }

      const data: ScheduleSuggestionResponse = await response.json()
      
      setSuggestionState({
        loading: false,
        response: data,
        error: null
      })

      // デフォルトで全ての提案を選択
      setSelectedSuggestions(new Set(data.suggestedSchedules.map((_, index) => index)))

    } catch (error) {
      setSuggestionState({
        loading: false,
        response: null,
        error: error instanceof Error ? error.message : 'エラーが発生しました'
      })
    }
  }

  // タスク選択の切り替え
  const handleTaskToggle = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  // 提案選択の切り替え
  const handleSuggestionToggle = (index: number) => {
    const newSelected = new Set(selectedSuggestions)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedSuggestions(newSelected)
  }

  // スケジュール作成
  const handleCreateSchedules = () => {
    if (!suggestionState.response || !onScheduleCreate) return

    const schedulesToCreate = suggestionState.response.suggestedSchedules
      .filter((_, index) => selectedSuggestions.has(index))
      .map(suggestion => ({
        title: suggestion.schedule.title,
        startTime: suggestion.schedule.startTime,
        endTime: suggestion.schedule.endTime,
        date: new Date(suggestion.schedule.date!),
        description: suggestion.schedule.description,
        isFixed: false
      }))

    onScheduleCreate(schedulesToCreate)
    
    // リセット
    setSelectedTasks(new Set())
    setSelectedSuggestions(new Set())
    setSuggestionState({ loading: false, response: null, error: null })
  }

  // 優先度カラー
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // スコアカラー
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  // 時間フォーマット
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
    }
    return `${mins}分`
  }

  if (suggestionState.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800 mb-1">
              エラーが発生しました
            </h4>
            <p className="text-sm text-red-700 mb-3">
              {suggestionState.error}
            </p>
            {suggestionState.error.includes('API') && (
              <div className="text-xs text-red-600 bg-red-100 p-2 rounded mb-3">
                <p className="font-medium mb-1">💡 ヒント:</p>
                <p>OpenAI APIキーが設定されていない場合、基本的なアルゴリズムによるスケジュール提案が利用できます。</p>
              </div>
            )}
            <button
              onClick={() => setSuggestionState({ loading: false, response: null, error: null })}
              className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Zap className="w-5 h-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              AIスケジュール提案
            </h3>
          </div>
          
          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Settings className="w-4 h-4 mr-1" />
            設定
          </button>
        </div>

        {/* 設定パネル */}
        {showPreferences && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  作業開始時間
                </label>
                <input
                  type="time"
                  value={preferences.preferredStartTime}
                  onChange={(e) => setPreferences(prev => ({ ...prev, preferredStartTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  作業終了時間
                </label>
                <input
                  type="time"
                  value={preferences.preferredEndTime}
                  onChange={(e) => setPreferences(prev => ({ ...prev, preferredEndTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  休憩時間 (分)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={preferences.breakDuration}
                  onChange={(e) => setPreferences(prev => ({ ...prev, breakDuration: parseInt(e.target.value) || 15 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  集中ブロック (分)
                </label>
                <input
                  type="number"
                  min="30"
                  max="180"
                  value={preferences.focusBlockDuration}
                  onChange={(e) => setPreferences(prev => ({ ...prev, focusBlockDuration: parseInt(e.target.value) || 90 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowWeekends"
                checked={preferences.allowWeekends}
                onChange={(e) => setPreferences(prev => ({ ...prev, allowWeekends: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="allowWeekends" className="text-sm text-gray-700">
                土日も含める
              </label>
            </div>
          </div>
        )}

        {/* タスク選択 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">スケジュールに追加するタスク</h4>
            <span className="text-sm text-gray-500">
              {selectedTasks.size} / {availableTasks.length} 選択
            </span>
          </div>

          {availableTasks.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>スケジュール可能なタスクがありません</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableTasks.map(task => (
                <div
                  key={task.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTasks.has(task.id) 
                      ? 'border-indigo-300 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTaskToggle(task.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => handleTaskToggle(task.id)}
                        className="mr-3 text-indigo-600"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 truncate">{task.title}</h5>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDuration(task.estimatedDuration)}
                          </div>
                          <div className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                          </div>
                          <div className="flex items-center">
                            <span
                              className="w-2 h-2 rounded-full mr-1"
                              style={{ backgroundColor: task.category.color }}
                            />
                            {task.category.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleGenerateSuggestions}
            disabled={selectedTasks.size === 0 || suggestionState.loading}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {suggestionState.loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                AIが提案を生成中...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                スケジュール提案を生成 ({selectedTasks.size})
              </>
            )}
          </button>
        </div>
      </div>

      {/* 提案結果 */}
      {suggestionState.response && (
        <div className="p-4">
          <div className="space-y-4">
            {/* サマリー */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {suggestionState.response.summary.totalHours.toFixed(1)}h
                </div>
                <div className="text-xs text-gray-600">総作業時間</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-2xl font-bold text-green-600">
                    {suggestionState.response.summary.efficiency}%
                  </span>
                </div>
                <div className="text-xs text-gray-600">効率性</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {suggestionState.response.summary.stress}%
                </div>
                <div className="text-xs text-gray-600">ストレス度</div>
              </div>
            </div>

            {/* 提案されたスケジュール */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">提案されたスケジュール</h4>
                <span className="text-sm text-gray-500">
                  {selectedSuggestions.size} / {suggestionState.response.suggestedSchedules.length} 選択
                </span>
              </div>

              <div className="space-y-3">
                {suggestionState.response.suggestedSchedules.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedSuggestions.has(index) 
                        ? 'border-indigo-300 bg-indigo-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSuggestionToggle(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        <input
                          type="checkbox"
                          checked={selectedSuggestions.has(index)}
                          onChange={() => handleSuggestionToggle(index)}
                          className="mr-3 mt-1 text-indigo-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">{suggestion.schedule.title}</h5>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(suggestion.score)}`}>
                              スコア: {suggestion.score}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {format(new Date(suggestion.schedule.date!), 'M月d日(E)', { locale: ja })}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {suggestion.schedule.startTime?.substring(0, 5)} - {suggestion.schedule.endTime?.substring(0, 5)}
                            </div>
                          </div>
                          
                          {suggestion.schedule.description && (
                            <p className="text-sm text-gray-600 mb-2">{suggestion.schedule.description}</p>
                          )}
                          
                          <p className="text-xs text-gray-500 italic">{suggestion.reasoning}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 競合・警告 */}
            {suggestionState.response.conflicts.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  注意が必要な項目
                </h4>
                <div className="space-y-2">
                  {suggestionState.response.conflicts.map((conflict, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-medium text-yellow-800">{conflict.task}</div>
                      <div className="text-yellow-700">{conflict.issue}</div>
                      {conflict.suggestions.length > 0 && (
                        <ul className="list-disc list-inside text-yellow-600 mt-1">
                          {conflict.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-xs">{suggestion}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreateSchedules}
                disabled={selectedSuggestions.size === 0}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                選択したスケジュールを作成 ({selectedSuggestions.size})
              </button>
              
              <button
                onClick={() => {
                  setSelectedTasks(new Set())
                  setSelectedSuggestions(new Set())
                  setSuggestionState({ loading: false, response: null, error: null })
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
