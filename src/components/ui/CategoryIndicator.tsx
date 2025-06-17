'use client'

import { ScheduleCategory } from '@/types'
import { getContrastColor, createColorVariants } from '@/lib/colors'

interface CategoryIndicatorProps {
  category: ScheduleCategory
  size?: 'sm' | 'md' | 'lg'
  variant?: 'dot' | 'badge' | 'bar' | 'full'
  showName?: boolean
  className?: string
}

export default function CategoryIndicator({
  category,
  size = 'md',
  variant = 'badge',
  showName = true,
  className = ''
}: CategoryIndicatorProps) {
  const colorVariants = createColorVariants(category.color)

  const sizeClasses = {
    sm: {
      dot: 'w-2 h-2',
      badge: 'px-2 py-1 text-xs',
      bar: 'h-1',
      full: 'px-2 py-1 text-xs'
    },
    md: {
      dot: 'w-3 h-3',
      badge: 'px-3 py-1 text-sm',
      bar: 'h-2',
      full: 'px-3 py-2 text-sm'
    },
    lg: {
      dot: 'w-4 h-4',
      badge: 'px-4 py-2 text-base',
      bar: 'h-3',
      full: 'px-4 py-2 text-base'
    }
  }

  if (variant === 'dot') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div
          className={`rounded-full ${sizeClasses[size].dot}`}
          style={{ backgroundColor: category.color }}
          title={category.name}
        />
        {showName && (
          <span className="text-gray-700 text-sm">
            {category.icon && <span className="mr-1">{category.icon}</span>}
            {category.name}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'bar') {
    return (
      <div className={`w-full ${className}`}>
        <div
          className={`w-full rounded ${sizeClasses[size].bar}`}
          style={{
            backgroundColor: category.color,
            background: `linear-gradient(90deg, ${category.color} 0%, ${colorVariants.light} 100%)`
          }}
          title={category.name}
        />
        {showName && (
          <div className="mt-1 text-xs text-gray-600">
            {category.icon && <span className="mr-1">{category.icon}</span>}
            {category.name}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'badge') {
    return (
      <span
        className={`
          inline-flex items-center rounded-full font-medium
          ${sizeClasses[size].badge} ${className}
        `}
        style={{
          backgroundColor: colorVariants.opacity[20],
          color: category.color,
          border: `1px solid ${colorVariants.opacity[30]}`
        }}
      >
        {category.icon && <span className="mr-1">{category.icon}</span>}
        {showName ? category.name : ''}
      </span>
    )
  }

  if (variant === 'full') {
    return (
      <div
        className={`
          inline-flex items-center rounded font-medium
          ${sizeClasses[size].full} ${className}
        `}
        style={{
          backgroundColor: category.color,
          color: colorVariants.contrast
        }}
      >
        {category.icon && <span className="mr-1">{category.icon}</span>}
        {showName ? category.name : ''}
      </div>
    )
  }

  return null
}