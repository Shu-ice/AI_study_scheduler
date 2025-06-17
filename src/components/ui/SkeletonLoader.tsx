'use client'

import { memo } from 'react'

interface SkeletonLoaderProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'card' | 'schedule' | 'task'
  width?: string | number
  height?: string | number
  className?: string
  count?: number
  animation?: 'pulse' | 'wave' | 'shimmer'
}

const SkeletonLoader = memo(function SkeletonLoader({
  variant = 'text',
  width = '100%',
  height = '1rem',
  className = '',
  count = 1,
  animation = 'shimmer'
}: SkeletonLoaderProps) {
  
  const baseClasses = 'bg-gray-200 dark:bg-gray-700 rounded'
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse',
    shimmer: 'relative overflow-hidden bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700'
  }
  
  const shimmerEffect = animation === 'shimmer' ? (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />
  ) : null

  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return { width, height }
      case 'rectangular':
        return { width, height }
      case 'circular':
        return { 
          width: width || height, 
          height: height || width,
          borderRadius: '50%'
        }
      case 'card':
        return { 
          width: width || '100%', 
          height: height || '200px',
          borderRadius: '8px'
        }
      case 'schedule':
        return {
          width: width || '100%',
          height: height || '60px',
          borderRadius: '6px'
        }
      case 'task':
        return {
          width: width || '100%',
          height: height || '80px',
          borderRadius: '8px'
        }
      default:
        return { width, height }
    }
  }

  const renderSkeleton = () => (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${className}`}
      style={getVariantStyles()}
    >
      {shimmerEffect}
    </div>
  )

  if (count === 1) {
    return renderSkeleton()
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  )
})

// スケジュール専用スケルトン
export const ScheduleSkeleton = memo(function ScheduleSkeleton({
  count = 3,
  className = ''
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <SkeletonLoader variant="text" width="60%" height="16px" />
            <SkeletonLoader variant="text" width="40px" height="12px" />
          </div>
          <SkeletonLoader variant="text" width="80%" height="12px" />
          <div className="flex justify-between items-center mt-3">
            <SkeletonLoader variant="text" width="50px" height="10px" />
            <SkeletonLoader variant="circular" width="24px" height="24px" />
          </div>
        </div>
      ))}
    </div>
  )
})

// タスク専用スケルトン
export const TaskSkeleton = memo(function TaskSkeleton({
  count = 5,
  className = ''
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <SkeletonLoader variant="circular" width="20px" height="20px" />
            <div className="flex-1 space-y-2">
              <SkeletonLoader variant="text" width="70%" height="16px" />
              <SkeletonLoader variant="text" width="90%" height="12px" />
              <div className="flex gap-2 mt-2">
                <SkeletonLoader variant="text" width="60px" height="20px" />
                <SkeletonLoader variant="text" width="80px" height="20px" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

// カレンダー専用スケルトン
export const CalendarSkeleton = memo(function CalendarSkeleton({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <SkeletonLoader variant="text" width="150px" height="24px" />
        <div className="flex gap-2">
          <SkeletonLoader variant="rectangular" width="32px" height="32px" />
          <SkeletonLoader variant="rectangular" width="32px" height="32px" />
        </div>
      </div>
      
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="bg-white p-2 text-center">
            <SkeletonLoader variant="text" width="24px" height="12px" />
          </div>
        ))}
      </div>
      
      {/* タイムスロット */}
      <div className="grid grid-cols-8 gap-px bg-gray-200" style={{ height: '400px' }}>
        <div className="bg-white p-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-12 flex items-center">
              <SkeletonLoader variant="text" width="40px" height="10px" />
            </div>
          ))}
        </div>
        {Array.from({ length: 7 }).map((_, dayIndex) => (
          <div key={dayIndex} className="bg-white">
            {Array.from({ length: 8 }).map((_, timeIndex) => (
              <div key={timeIndex} className="h-12 p-1 border-b border-gray-100">
                {Math.random() > 0.7 && (
                  <SkeletonLoader 
                    variant="schedule" 
                    height="40px" 
                    className="opacity-60" 
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
})

// ダッシュボード専用スケルトン
export const DashboardSkeleton = memo(function DashboardSkeleton({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonLoader variant="text" width="80px" height="12px" />
                <SkeletonLoader variant="text" width="60px" height="24px" />
              </div>
              <SkeletonLoader variant="circular" width="40px" height="40px" />
            </div>
          </div>
        ))}
      </div>
      
      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <SkeletonLoader variant="text" width="150px" height="20px" />
          <TaskSkeleton count={3} />
        </div>
        <div className="space-y-4">
          <SkeletonLoader variant="text" width="120px" height="20px" />
          <SkeletonLoader variant="card" height="200px" />
        </div>
      </div>
    </div>
  )
})

export default SkeletonLoader