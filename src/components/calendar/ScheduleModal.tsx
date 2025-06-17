'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Schedule, ScheduleCategory, RepeatPattern } from '@/types'
import CategorySelector from '@/components/ui/CategorySelector'
import CategoryManager from './CategoryManager'
import RepeatPatternSelector from '@/components/ui/RepeatPatternSelector'
import ExceptionDatePicker from '@/components/ui/ExceptionDatePicker'

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (schedule: Partial<Schedule>) => void
  onDelete?: (scheduleId: string) => void
  schedule?: Schedule | null
  initialDate?: Date
  initialTime?: string
  categories: ScheduleCategory[]
  onCategoryUpdate?: (categories: ScheduleCategory[]) => void
}

export default function ScheduleModal(props: ScheduleModalProps) {
  const {
    isOpen,
    onClose,
    onSave,
    onDelete,
    schedule,
    initialDate,
    initialTime,
    categories,
    onCategoryUpdate
  } = props

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    date: new Date(),
    categoryId: '',
    isFixed: true,
    repeatPattern: undefined as RepeatPattern | undefined
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
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

    if (!formData.startTime) {
      newErrors.startTime = '開始時間は必須です'
    }

    if (!formData.endTime) {
      newErrors.endTime = '終了時間は必須です'
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = '終了時間は開始時間より後にしてください'
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

      const scheduleData: Partial<Schedule> = {
        id: schedule?.id,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        startTime: formData.startTime,
        endTime: formData.endTime,
        date: formData.date,
        category: selectedCat,
        isFixed: formData.isFixed,
        repeatPattern: formData.repeatPattern
      }

      await onSave(scheduleData)
      onClose()
    } catch (error) {
      console.error('スケジュール保存エラー:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 削除ハンドラー
  const handleDelete = async () => {
    if (!schedule?.id || !onDelete) return

    setIsSubmitting(true)
    try {
      await onDelete(schedule.id)
      onClose()
    } catch (error) {
      console.error('スケジュール削除エラー:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // モーダルが開かれた時のデータ初期化
  useEffect(() => {
    if (isOpen) {
      let initialFormData
      
      if (schedule) {
        // 編集モード
        initialFormData = {
          title: schedule.title,
          description: schedule.description || '',
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          date: new Date(schedule.date),
          categoryId: schedule.category.id,
          isFixed: schedule.isFixed,
          repeatPattern: schedule.repeatPattern
        }
      } else {
        // 新規作成モード
        const defaultEndTime = initialTime ? 
          `${(parseInt(initialTime.split(':')[0]) + 1).toString().padStart(2, '0')}:00` : 
          '09:00'
        
        initialFormData = {
          title: '',
          description: '',
          startTime: initialTime || '08:00',
          endTime: defaultEndTime,
          date: initialDate || new Date(),
          categoryId: categories.length > 0 ? categories[0].id : '',
          isFixed: true,
          repeatPattern: undefined
        }
      }
      
      setFormData(initialFormData)
      setErrors({})
      setShowDeleteConfirm(false)
      setIsSubmitting(false)
      setShowCategoryManager(false)
      
      // オートフォーカス
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen, schedule, initialDate, initialTime, categories])

  if (!isOpen) return null

  return (
    <>
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
                    {schedule ? 'スケジュール編集' : 'スケジュール作成'}
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
                      placeholder="例: チーム会議"
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
                    <div className="flex items-center justify-between mb-2">
                      <label 
                        htmlFor="category-selector"
                        className="block text-sm font-medium text-gray-700"
                      >
                        カテゴリー <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryManager(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.5 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        管理
                      </button>
                    </div>
                    <CategorySelector
                      categories={categories}
                      selectedCategory={selectedCategory || null}
                      onSelect={(category) => handleInputChange('categoryId', category?.id || '')}
                      placeholder="カテゴリーを選択してください"
                      searchable={true}
                      clearable={false}
                      className={errors.categoryId ? 'ring-1 ring-red-300' : ''}
                      aria-label="スケジュールのカテゴリーを選択"
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

                  {/* 日付・時間・説明・その他フィールド */}
                  <div>
                    <label 
                      htmlFor="date-input"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      日付
                    </label>
                    <input
                      id="date-input"
                      type="date"
                      value={format(formData.date, 'yyyy-MM-dd')}
                      onChange={(e) => handleInputChange('date', new Date(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label 
                        htmlFor="start-time"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        開始時間 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="start-time"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.startTime ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      />
                      {errors.startTime && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.startTime}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label 
                        htmlFor="end-time"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        終了時間 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="end-time"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => handleInputChange('endTime', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.endTime ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      />
                      {errors.endTime && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.endTime}
                        </p>
                      )}
                    </div>
                  </div>

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

                  {/* 繰り返し設定 */}
                  <div className="border-t border-gray-200 pt-5">
                    <RepeatPatternSelector
                      value={formData.repeatPattern}
                      onChange={(pattern) => handleInputChange('repeatPattern', pattern)}
                      startDate={formData.date}
                    />
                  </div>

                  {/* 例外日設定（繰り返しが有効な場合のみ表示） */}
                  {formData.repeatPattern && (
                    <div className="border-t border-gray-200 pt-5">
                      <ExceptionDatePicker
                        value={formData.repeatPattern.exceptions || []}
                        onChange={(exceptions) => {
                          if (formData.repeatPattern) {
                            handleInputChange('repeatPattern', {
                              ...formData.repeatPattern,
                              exceptions
                            })
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="isFixed"
                      checked={formData.isFixed}
                      onChange={(e) => handleInputChange('isFixed', e.target.checked)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor="isFixed" className="block text-sm font-medium text-gray-900">
                        固定スケジュール
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        チェックすると移動やサイズ変更ができなくなります
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* フッター */}
              <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row sm:justify-between gap-3">
                <div className="flex gap-2">
                  {schedule && onDelete && (
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
                    ) : schedule ? (
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                    {schedule ? '更新' : '作成'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* カテゴリ管理モーダル */}
      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
        onSave={async (updatedCategories) => {
          if (onCategoryUpdate) {
            onCategoryUpdate(updatedCategories)
          }
          setShowCategoryManager(false)
        }}
      />
    </>
  )
} 