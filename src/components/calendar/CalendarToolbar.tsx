'use client'

import { memo } from 'react'
import { CalendarSettings, TimeInterval } from '@/types'
import { ClockIcon, CogIcon } from '@heroicons/react/24/outline'

interface CalendarToolbarProps {
  settings: CalendarSettings
  onSettingsChange: (settings: Partial<CalendarSettings>) => void
  isMobile?: boolean
}

const CalendarToolbar = memo(function CalendarToolbar({
  settings,
  onSettingsChange,
  isMobile = false
}: CalendarToolbarProps) {
  const timeIntervalOptions: { value: TimeInterval; label: string }[] = [
    { value: 15, label: '15分' },
    { value: 30, label: '30分' },
    { value: 60, label: '1時間' }
  ]

  const hourOptions = Array.from({ length: 19 }, (_, i) => ({
    value: i + 5,
    label: `${(i + 5).toString().padStart(2, '0')}:00`
  }))

  return (
    <div className={`flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 ${
      isMobile ? 'flex-col space-y-3' : 'flex-row space-x-4'
    }`}>
      {/* 時間間隔設定 */}
      <div className={`flex items-center space-x-2 ${isMobile ? 'w-full' : ''}`}>
        <ClockIcon className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">間隔:</span>
        <div className="flex space-x-1">
          {timeIntervalOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onSettingsChange({ timeInterval: option.value })}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                settings.timeInterval === option.value
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              } ${isMobile ? 'min-h-[44px] min-w-[60px]' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 時間範囲設定 */}
      {!isMobile && (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">表示時間:</span>
          <select
            value={settings.startHour}
            onChange={(e) => onSettingsChange({ startHour: Number(e.target.value) })}
            className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {hourOptions.slice(0, -3).map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-gray-400">〜</span>
          <select
            value={settings.endHour}
            onChange={(e) => onSettingsChange({ endHour: Number(e.target.value) })}
            className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {hourOptions.slice(3).map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 詳細設定 */}
      <div className={`flex items-center space-x-3 ${isMobile ? 'w-full justify-between' : ''}`}>
        <label className="flex items-center space-x-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoHeight}
            onChange={(e) => onSettingsChange({ autoHeight: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700">自動調整</span>
        </label>
        
        <label className="flex items-center space-x-2 text-sm">
          <input
            type="checkbox"
            checked={settings.showOverlapping}
            onChange={(e) => onSettingsChange({ showOverlapping: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700">重複表示</span>
        </label>

        {isMobile && (
          <button
            className="p-2 text-gray-500 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="詳細設定"
          >
            <CogIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
})

export default CalendarToolbar