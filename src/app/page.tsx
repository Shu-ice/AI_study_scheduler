'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import WeeklyGrid from '@/components/calendar/WeeklyGrid'
import ScheduleModal from '@/components/calendar/ScheduleModal'
import ScheduleSuggestionPanel from '@/components/calendar/ScheduleSuggestionPanel'
import DayDetailView from '@/components/calendar/DayDetailView'
import TaskDashboard from '@/components/ui/TaskDashboard'
import TaskList from '@/components/ui/TaskList'
import TaskModal from '@/components/ui/TaskModal'
import AIChatModal from '@/components/ui/AIChatModal'
import ComparisonAnalytics from '@/components/analytics/ComparisonAnalytics'
import StatisticsDashboard from '@/components/analytics/StatisticsDashboard'
import { useTaskManagement } from '@/hooks/useTaskManagement'
import { Schedule, ScheduleCategory, Task, TaskStatus, ActualRecord } from '@/types'
import { Calendar, CheckSquare, Target, BarChart3, Bot, TrendingUp, PieChart } from 'lucide-react'

type TabType = 'calendar' | 'tasks' | 'dashboard' | 'analytics' | 'statistics'

export default function Home() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  
  // スケジュール関連の状態
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [categories, setCategories] = useState<ScheduleCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // モーダル関連の状態
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [modalInitialDate, setModalInitialDate] = useState<Date>()
  const [modalInitialTime, setModalInitialTime] = useState<string>()

  // タスク管理フック
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask
  } = useTaskManagement({
    autoRefresh: true,
    refreshInterval: 30000
  })

  // タスクモーダル関連の状態
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // AIチャット関連の状態
  const [aiChatOpen, setAiChatOpen] = useState(false)

  // 日別詳細ビュー関連の状態
  const [dayDetailOpen, setDayDetailOpen] = useState(false)
  const [selectedDayDate, setSelectedDayDate] = useState<Date>(new Date())

  // 関数定義（useEffectより前に配置）
  const loadSchedules = useCallback(async () => {
    try {
      setIsLoading(true)
      const now = new Date()
      const startDate = format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd')
      const endDate = format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd')
      
      const response = await fetch(`/api/schedules?startDate=${startDate}&endDate=${endDate}`)
      
      if (response.ok) {
        const data = await response.json()
        setSchedules(data.map((schedule: any) => ({
          ...schedule,
          date: new Date(schedule.date)
        })))
      } else {
        console.error('スケジュールの読み込みに失敗しました')
      }
    } catch (error) {
      console.error('スケジュール読み込みエラー:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      } else {
        console.error('カテゴリーの読み込みに失敗しました')
      }
    } catch (error) {
      console.error('カテゴリー読み込みエラー:', error)
    }
  }, [])

  // スケジュールとカテゴリーの読み込み
  useEffect(() => {
    if (session?.user?.id) {
      loadSchedules()
      loadCategories()
      fetchTasks()
    }
  }, [session?.user?.id]) // 関数の依存を削除

  // スケジュール関連のハンドラー
  const handleScheduleClick = (schedule: Schedule) => {
    console.log('📅 スケジュールクリック:', schedule)
    setSelectedSchedule(schedule)
    setModalOpen(true)
  }

  const handleTimeSlotClick = (date: Date, time: string) => {
    console.log('⏰ タイムスロットクリック:', { date, time })
    setSelectedSchedule(null)
    setModalInitialDate(date)
    setModalInitialTime(time)
    setModalOpen(true)
  }

  const handleScheduleSave = async (scheduleData: Partial<Schedule>) => {
    try {
      console.log('💾 スケジュール保存開始:', scheduleData)
      
      if (selectedSchedule) {
        // 更新
        const response = await fetch(`/api/schedules/${selectedSchedule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scheduleData),
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'スケジュールの更新に失敗しました')
        }
        
        await loadSchedules()
        console.log('✅ スケジュール更新成功')
      } else {
        // 新規作成
        const response = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scheduleData),
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'スケジュールの作成に失敗しました')
        }
        
        await loadSchedules()
        console.log('✅ スケジュール作成成功')
      }
      
      setModalOpen(false)
      setSelectedSchedule(null)
    } catch (error) {
      console.error('❌ スケジュール保存エラー:', error)
      alert(error instanceof Error ? error.message : 'スケジュールの保存に失敗しました')
    }
  }

  const handleScheduleDelete = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await loadSchedules()
        setModalOpen(false)
      }
    } catch (error) {
      console.error('スケジュール削除エラー:', error)
    }
  }

  const handleCategoryUpdate = (updatedCategories: ScheduleCategory[]) => {
    setCategories(updatedCategories)
  }

  // タスク関連のハンドラー
  const handleTaskCreate = () => {
    setSelectedTask(null)
    setTaskModalOpen(true)
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setTaskModalOpen(true)
  }

  const handleTaskSave = async (taskData: Partial<Task>) => {
    try {
      if (selectedTask) {
        // 更新
        await updateTask(selectedTask.id, taskData)
      } else {
        // 新規作成
        await createTask(taskData as any)
      }
      setTaskModalOpen(false)
      await fetchTasks()
    } catch (error) {
      console.error('タスク保存エラー:', error)
    }
  }

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTask(taskId, { status })
      await fetchTasks()
    } catch (error) {
      console.error('タスクステータス更新エラー:', error)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      setTaskModalOpen(false)
      await fetchTasks()
    } catch (error) {
      console.error('タスク削除エラー:', error)
    }
  }

  const handleViewAllTasks = () => {
    setActiveTab('tasks')
  }

  // AIチャット関連のハンドラー
  const handleAITaskAccept = async (task: Partial<Task>) => {
    try {
      await createTask(task as any)
      await fetchTasks()
    } catch (error) {
      console.error('AIタスク追加エラー:', error)
    }
  }

  // 複数タスク作成ハンドラー
  const handleTasksCreate = async (tasks: Partial<Task>[]) => {
    try {
      for (const task of tasks) {
        await createTask(task as any)
      }
      await fetchTasks()
    } catch (error) {
      console.error('複数タスク作成エラー:', error)
    }
  }

  // 複数スケジュール作成ハンドラー
  const handleSchedulesCreate = async (schedules: Partial<Schedule>[]) => {
    try {
      console.log('🚀 複数スケジュール作成開始:', schedules)
      
      const results = []
      for (let i = 0; i < schedules.length; i++) {
        const schedule = schedules[i]
        console.log(`📝 スケジュール ${i + 1}/${schedules.length} 作成中:`, schedule)
        
        const response = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schedule),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`❌ スケジュール ${i + 1} 作成失敗:`, errorData)
          
          // 具体的なエラーメッセージを表示
          const errorMessage = errorData.details 
            ? `スケジュール "${schedule.title}" の作成に失敗しました: ${errorData.error}\n詳細: ${JSON.stringify(errorData.details, null, 2)}`
            : `スケジュール "${schedule.title}" の作成に失敗しました: ${errorData.error || 'サーバーエラー'}`
          
          alert(errorMessage)
          continue
        }

        const result = await response.json()
        results.push(result)
        console.log(`✅ スケジュール ${i + 1} 作成成功:`, result.id)
      }
      
      console.log(`🎉 全スケジュール作成完了: ${results.length}/${schedules.length} 成功`)
      await loadSchedules()
      
      // 成功メッセージ
      if (results.length === schedules.length) {
        alert(`${results.length}件のスケジュールを作成しました！`)
      } else {
        alert(`${results.length}/${schedules.length}件のスケジュールを作成しました。`)
      }
      
    } catch (error) {
      console.error('💥 複数スケジュール作成エラー:', error)
      alert('スケジュールの作成中にエラーが発生しました。')
    }
  }

  // 日別詳細ビュー関連のハンドラー
  const handleDayClick = (date: Date) => {
    setSelectedDayDate(date)
    setDayDetailOpen(true)
  }

  const handleActualRecordSave = async (scheduleId: string, actualRecord: Partial<ActualRecord>) => {
    // 実績記録は API 内で処理されるため、特に追加処理は不要
    console.log('実績記録が保存されました:', { scheduleId, actualRecord })
  }

  // 認証チェック
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ログインが必要です
          </h1>
          <p className="text-gray-600">
            この機能を使用するにはログインしてください。
          </p>
        </div>
      </div>
    )
  }

  // タブ設定
  const tabs = [
    { key: 'dashboard', label: 'ダッシュボード', icon: BarChart3 },
    { key: 'calendar', label: 'カレンダー', icon: Calendar },
    { key: 'tasks', label: 'タスク管理', icon: CheckSquare },
    { key: 'analytics', label: '分析', icon: TrendingUp },
    { key: 'statistics', label: '統計', icon: PieChart },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Target className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                週間縦型プランナー
              </h1>
            </div>
            
            <div className="flex items-center gap-8">
              {/* タブナビゲーション */}
              <nav className="flex space-x-8">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as TabType)}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                        activeTab === tab.key
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
              
              {/* AIチャットボタン */}
              <button
                onClick={() => setAiChatOpen(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Bot className="w-4 h-4 mr-2" />
                AI アシスタント
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <TaskDashboard
            tasks={tasks}
            onCreateTask={handleTaskCreate}
            onTaskCreate={handleTasksCreate}
            onViewAllTasks={handleViewAllTasks}
            onTaskClick={handleTaskClick}
          />
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6 bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 rounded-xl p-6 shadow-sm">
            {/* スケジュール提案パネル */}
            <ScheduleSuggestionPanel
              tasks={tasks}
              existingSchedules={schedules}
              onScheduleCreate={handleSchedulesCreate}
            />
            
            {/* 週間カレンダー */}
            <div className="h-[calc(100vh-20rem)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-lg text-gray-600">スケジュール読み込み中...</div>
                </div>
              ) : (
                <WeeklyGrid
                  schedules={schedules}
                  categories={categories}
                  onScheduleClick={handleScheduleClick}
                  onTimeSlotClick={handleTimeSlotClick}
                  onDayClick={handleDayClick}
                  onScheduleUpdate={loadSchedules}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <TaskList
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onTaskStatusChange={handleTaskStatusChange}
            onTaskDelete={handleTaskDelete}
            onCreateTask={handleTaskCreate}
            loading={tasksLoading}
          />
        )}

        {activeTab === 'analytics' && (
          <ComparisonAnalytics />
        )}

        {activeTab === 'statistics' && (
          <StatisticsDashboard />
        )}
      </main>

      {/* スケジュールモーダル */}
      <ScheduleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleScheduleSave}
        onDelete={handleScheduleDelete}
        schedule={selectedSchedule}
        initialDate={modalInitialDate}
        initialTime={modalInitialTime}
        categories={categories}
        onCategoryUpdate={handleCategoryUpdate}
      />

      {/* タスクモーダル */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        task={selectedTask}
        categories={categories}
      />

      {/* AIチャットモーダル */}
      <AIChatModal
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        onTaskAccept={handleAITaskAccept}
        onScheduleAccept={(suggestion) => {
          // TODO: スケジュール提案の処理を実装
          console.log('Schedule suggestion:', suggestion)
        }}
      />

      {/* エラー表示 */}
      {tasksError && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
          <p className="text-sm">{tasksError}</p>
        </div>
      )}

      {/* DayDetailViewモーダル */}
      {dayDetailOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-auto">
            <DayDetailView
              date={selectedDayDate}
              schedules={schedules}
              onClose={() => setDayDetailOpen(false)}
              onScheduleUpdate={loadSchedules}
              onActualRecordSave={handleActualRecordSave}
            />
          </div>
        </div>
      )}
    </div>
  )
} 