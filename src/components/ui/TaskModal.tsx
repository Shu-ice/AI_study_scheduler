'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Task, TaskPriority, TaskStatus, ScheduleCategory } from '@/types'
import CategorySelector from '@/components/ui/CategorySelector'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (task: Partial<Task>) => void
  onDelete?: (taskId: string) => void
  task?: Task | null
  categories: ScheduleCategory[]
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: '低', color: 'text-green-600 bg-green-100' },
  { value: 'medium', label: '中', color: 'text-yellow-600 bg-yellow-100' },
  { value: 'high', label: '高', color: 'text-red-600 bg-red-100' }
]

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'pending', label: '未着手', color: 'text-gray-600 bg-gray-100' },
  { value: 'in-progress', label: '進行中', color: 'text-blue-600 bg-blue-100' },
  { value: 'completed', label: '完了', color: 'text-green-600 bg-green-100' },
  { value: 'cancelled', label: 'キャンセル', color: 'text-red-600 bg-red-100' }
]

export default function TaskModal(props: TaskModalProps) {
  const {
    isOpen,
    onClose,
    onSave,
    onDelete,
    task,
    categories
  } = props

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimatedDuration: 60, // minutes
    priority: 'medium' as TaskPriority,
    deadline: '',
    categoryId: '',
    status: 'pending' as TaskStatus
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // 選択されたカテゴリを取得
  const selectedCategory = categories.find(cat => cat.id === formData.categoryId)

  // バリデーション関数
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です'
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'カテゴリーを選択してください'
    }

    if (formData.estimatedDuration <= 0) {
      newErrors.estimatedDuration = '推定時間は1分以上にしてください'
    }

    if (formData.deadline && new Date(formData.deadline) < new Date()) {
      newErrors.deadline = '期限は今日以降の日付を設定してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 入力値変更ハンドラー
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // フォーム送信ハンドラー
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const selectedCat = categories.find(cat => cat.id === formData.categoryId)
      if (!selectedCat) throw new Error('カテゴリが見つかりません')

      const taskData: Partial<Task> = {
        id: task?.id,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        estimatedDuration: formData.estimatedDuration,
        priority: formData.priority,
        deadline: formData.deadline ? new Date(formData.deadline) : undefined,
        category: selectedCat,
        status: formData.status
      }

      await onSave(taskData)
      onClose()
    } catch (error) {
      console.error('タスク保存エラー:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 削除ハンドラー
  const handleDelete = async () => {
    if (!task?.id || !onDelete) return

    setIsSubmitting(true)
    try {
      await onDelete(task.id)
      onClose()
    } catch (error) {
      console.error('タスク削除エラー:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // モーダルが開かれた時のデータ初期化
  useEffect(() => {
    if (isOpen) {
      let initialFormData
      
      if (task) {
        // 編集モード
        initialFormData = {
          title: task.title,
          description: task.description || '',
          estimatedDuration: task.estimatedDuration,
          priority: task.priority,
          deadline: task.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : '',
          categoryId: task.category.id,
          status: task.status
        }
      } else {
        // 新規作成モード
        initialFormData = {
          title: '',
          description: '',
          estimatedDuration: 60,
          priority: 'medium' as TaskPriority,
          deadline: '',
          categoryId: categories.length > 0 ? categories[0].id : '',
          status: 'pending' as TaskStatus
        }
      }
      
      setFormData(initialFormData)
      setErrors({})
      setShowDeleteConfirm(false)
      setIsSubmitting(false)
      
      // オートフォーカス
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen, task, categories])

  // 推定時間をフォーマット
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
    }
    return `${mins}分`
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景オーバーレイ */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* モーダルコンテンツ */}
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border">
          <form onSubmit={handleSubmit}>
            {/* ヘッダー */}
            <div className="bg-white px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-6">
                <h3 
                  id="modal-title"
                  className="text-xl leading-6 font-semibold text-gray-900 flex items-center gap-2"
                >
                  {selectedCategory && (
                    <span 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: selectedCategory.color }}
                      aria-hidden="true"
                    />
                  )}
                  {task ? 'タスク編集' : 'タスク作成'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                  aria-label="モーダルを閉じる"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* フォームフィールド */}
              <div className="space-y-5">
                {/* タイトル */}
                <div>
                  <label 
                    htmlFor="title-input"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    タイトル <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    id="title-input"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    placeholder="例: レポート作成"
                    maxLength={100}
                    aria-describedby={errors.title ? "title-error" : undefined}
                  />
                  {errors.title && (
                    <p id="title-error" className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.title}
                    </p>
                  )}
                </div>

                {/* カテゴリー */}
                <div>
                  <label 
                    htmlFor="category-selector"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    カテゴリー <span className="text-red-500">*</span>
                  </label>
                  <CategorySelector
                    categories={categories}
                    selectedCategory={selectedCategory || null}
                    onSelect={(category) => handleInputChange('categoryId', category?.id || '')}
                    placeholder="カテゴリーを選択してください"
                    searchable={true}
                    clearable={false}
                    className={errors.categoryId ? 'ring-1 ring-red-300' : ''}
                    aria-label="タスクのカテゴリーを選択"
                  />
                  {errors.categoryId && (
                    <p id="category-error" className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.categoryId}
                    </p>
                  )}
                </div>

                {/* 推定時間と優先度 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label 
                      htmlFor="estimated-duration"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      推定時間
                    </label>
                    <div className="relative">
                      <input
                        id="estimated-duration"
                        type="number"
                        min="1"
                        max="480"
                        value={formData.estimatedDuration}
                        onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value) || 0)}
                        className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.estimatedDuration ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">分</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDuration(formData.estimatedDuration)}
                    </p>
                    {errors.estimatedDuration && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.estimatedDuration}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label 
                      htmlFor="priority"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      優先度
                    </label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value as TaskPriority)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all"
                    >
                      {PRIORITY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 期限 */}
                <div>
                  <label 
                    htmlFor="deadline"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    期限
                  </label>
                  <input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => handleInputChange('deadline', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.deadline ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  />
                  {errors.deadline && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.deadline}
                    </p>
                  )}
                </div>

                {/* ステータス（編集時のみ表示） */}
                {task && (
                  <div>
                    <label 
                      htmlFor="status"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      ステータス
                    </label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value as TaskStatus)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all"
                    >
                      {STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 説明 */}
                <div>
                  <label 
                    htmlFor="description-textarea"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    説明
                  </label>
                  <textarea
                    id="description-textarea"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all hover:border-gray-400"
                    placeholder="詳細な説明（任意）"
                  />
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row sm:justify-between gap-3">
              <div className="flex gap-2">
                {task && onDelete && (
                  <>
                    {showDeleteConfirm ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={isSubmitting}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          ) : (
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                          本当に削除
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-lg shadow-sm text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        削除
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length > 0}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : task ? (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                  {task ? '更新' : '作成'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}