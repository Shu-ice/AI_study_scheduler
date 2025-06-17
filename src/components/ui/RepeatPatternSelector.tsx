'use client'

import React, { useState, useEffect } from 'react'
import { RepeatPattern } from '@/types'

interface RepeatPatternSelectorProps {
  value?: RepeatPattern
  onChange: (pattern: RepeatPattern | undefined) => void
  startDate?: Date
}

const WEEK_DAYS = [
  { value: 0, label: '日', shortLabel: '日' },
  { value: 1, label: '月', shortLabel: '月' },
  { value: 2, label: '火', shortLabel: '火' },
  { value: 3, label: '水', shortLabel: '水' },
  { value: 4, label: '木', shortLabel: '木' },
  { value: 5, label: '金', shortLabel: '金' },
  { value: 6, label: '土', shortLabel: '土' },
]

const WEEKDAYS = [1, 2, 3, 4, 5] // Monday to Friday

export default function RepeatPatternSelector({
  value,
  onChange,
  startDate = new Date()
}: RepeatPatternSelectorProps) {
  const [isEnabled, setIsEnabled] = useState(!!value)
  const [pattern, setPattern] = useState<RepeatPattern>(
    value || {
      type: 'weekly',
      interval: 1,
      customDays: []
    }
  )
  const [previewDates, setPreviewDates] = useState<Date[]>([])

  // 繰り返しパターンの変更を親コンポーネントに通知
  useEffect(() => {
    if (isEnabled) {
      onChange(pattern)
    } else {
      onChange(undefined)
    }
  }, [isEnabled, pattern, onChange])

  // プレビュー日程を生成
  useEffect(() => {
    if (!isEnabled) {
      setPreviewDates([])
      return
    }

    const dates = generatePreviewDates(pattern, startDate)
    setPreviewDates(dates)
  }, [pattern, startDate, isEnabled])

  const generatePreviewDates = (pattern: RepeatPattern, start: Date): Date[] => {
    const dates: Date[] = []
    const maxPreview = 5
    let current = new Date(start)
    let count = 0

    while (count < maxPreview) {
      switch (pattern.type) {
        case 'daily':
          dates.push(new Date(current))
          current.setDate(current.getDate() + pattern.interval)
          break
        
        case 'weekly':
          dates.push(new Date(current))
          current.setDate(current.getDate() + (7 * pattern.interval))
          break
        
        case 'weekdays':
          if (WEEKDAYS.includes(current.getDay())) {
            dates.push(new Date(current))
            count++
          }
          current.setDate(current.getDate() + 1)
          continue
        
        case 'custom':
          if (pattern.customDays && pattern.customDays.includes(current.getDay())) {
            dates.push(new Date(current))
            count++
          }
          current.setDate(current.getDate() + 1)
          continue
      }
      count++
    }

    return dates
  }

  const handlePatternChange = (updates: Partial<RepeatPattern>) => {
    setPattern(prev => ({ ...prev, ...updates }))
  }

  const handleCustomDayToggle = (dayValue: number) => {
    const currentDays = pattern.customDays || []
    const newDays = currentDays.includes(dayValue)
      ? currentDays.filter(d => d !== dayValue)
      : [...currentDays, dayValue].sort()
    
    handlePatternChange({ customDays: newDays })
  }

  return (
    <div className="space-y-4">
      {/* 繰り返し設定のオン/オフ */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          繰り返し設定
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-11 h-6 rounded-full transition-colors ${
            isEnabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            } mt-0.5 ml-0.5`} />
          </div>
        </label>
      </div>

      {isEnabled && (
        <>
          {/* 繰り返しタイプの選択 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              繰り返しパターン
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'daily', label: '毎日' },
                { value: 'weekly', label: '毎週' },
                { value: 'weekdays', label: '平日のみ' },
                { value: 'custom', label: 'カスタム' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handlePatternChange({ 
                    type: value as RepeatPattern['type'],
                    customDays: value === 'weekdays' ? WEEKDAYS : []
                  })}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    pattern.type === value
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 間隔設定（日次・週次の場合） */}
          {(pattern.type === 'daily' || pattern.type === 'weekly') && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                間隔
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={pattern.interval}
                  onChange={(e) => handlePatternChange({ interval: parseInt(e.target.value) || 1 })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {pattern.type === 'daily' ? '日ごと' : '週間ごと'}
                </span>
              </div>
            </div>
          )}

          {/* カスタム曜日選択 */}
          {pattern.type === 'custom' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                曜日を選択
              </label>
              <div className="flex space-x-1">
                {WEEK_DAYS.map(({ value, shortLabel }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleCustomDayToggle(value)}
                    className={`w-10 h-10 text-sm rounded-full border transition-colors ${
                      pattern.customDays?.includes(value)
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {shortLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 終了日設定 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              終了日（オプション）
            </label>
            <input
              type="date"
              value={pattern.endDate ? pattern.endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => handlePatternChange({
                endDate: e.target.value ? new Date(e.target.value) : undefined
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* プレビュー */}
          {previewDates.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                プレビュー（最初の5回）
              </label>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="space-y-1">
                  {previewDates.map((date, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      {date.toLocaleDateString('ja-JP', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 