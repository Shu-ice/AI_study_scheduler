'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, X } from 'lucide-react'

interface ExceptionDatePickerProps {
  value?: Date[]
  onChange: (exceptions: Date[]) => void
  disabled?: boolean
}

export default function ExceptionDatePicker({
  value = [],
  onChange,
  disabled = false
}: ExceptionDatePickerProps) {
  const [selectedDate, setSelectedDate] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [exceptions, setExceptions] = useState<Date[]>(value)

  // 例外日リストの変更を親コンポーネントに通知
  useEffect(() => {
    onChange(exceptions)
  }, [exceptions, onChange])

  // propsの値が変更された場合の同期
  useEffect(() => {
    setExceptions(value)
  }, [value])

  const handleAddException = () => {
    if (!selectedDate) return

    const date = new Date(selectedDate)
    
    // 既に存在するかチェック
    const exists = exceptions.some(exception => 
      exception.toDateString() === date.toDateString()
    )

    if (!exists) {
      const newExceptions = [...exceptions, date].sort((a, b) => a.getTime() - b.getTime())
      setExceptions(newExceptions)
    }

    setSelectedDate('')
    setShowCalendar(false)
  }

  const handleRemoveException = (index: number) => {
    const newExceptions = exceptions.filter((_, i) => i !== index)
    setExceptions(newExceptions)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddException()
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }

  // 今日以降の日付のみ選択可能
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">
        例外日の設定
      </label>

      {!disabled && (
        <div className="space-y-2">
          {/* 日付入力エリア */}
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                onKeyPress={handleKeyPress}
                min={minDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                placeholder="日付を選択"
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <button
              type="button"
              onClick={handleAddException}
              disabled={!selectedDate}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              追加
            </button>
          </div>
        </div>
      )}

      {/* 例外日リスト */}
      {exceptions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500">
            設定済みの例外日（{exceptions.length}件）
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {exceptions.map((exception, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-gray-700">
                  {formatDate(exception)}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveException(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="削除"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {exceptions.length === 0 && (
        <div className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
          例外日が設定されていません
        </div>
      )}

      {/* ヘルプテキスト */}
      <div className="text-xs text-gray-500">
        例外日に設定した日付は、繰り返しスケジュールから除外されます。
      </div>
    </div>
  )
} 