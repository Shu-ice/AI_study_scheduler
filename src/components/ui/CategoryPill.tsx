'use client'

import { ScheduleCategory } from '@/types'
import { getContrastColor } from '@/lib/colors'

interface CategoryPillProps {
  category: ScheduleCategory
  size?: 'sm' | 'md' | 'lg'
  variant?: 'filled' | 'outlined' | 'soft'
  showIcon?: boolean
  className?: string
  onClick?: () => void
  tabIndex?: number
  'aria-label'?: string
}

export default function CategoryPill({
  category,
  size = 'md',
  variant = 'filled',
  showIcon = true,
  className = '',
  onClick,
  tabIndex,
  'aria-label': ariaLabel,
  ...props
}: CategoryPillProps) {
  const textColor = getContrastColor(category.color)

  // サイズバリエーション
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2'
  }

  // アイコンサイズ
  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  // バリエーションスタイル
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: category.color,
          color: textColor,
          border: 'none'
        }
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          color: category.color,
          border: `2px solid ${category.color}`
        }
      case 'soft':
        return {
          backgroundColor: `${category.color}20`, // 20% opacity
          color: category.color,
          border: 'none'
        }
      default:
        return {
          backgroundColor: category.color,
          color: textColor,
          border: 'none'
        }
    }
  }

  const variantStyles = getVariantStyles()

  const baseClasses = `
    inline-flex items-center rounded-full font-medium transition-all duration-200
    ${sizeClasses[size]}
    ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2' : ''}
    ${className}
  `.trim()

  const focusRingColor = variant === 'filled' ? 'focus:ring-gray-500' : `focus:ring-[${category.color}]`

  if (onClick) {
    return (
      <button
        type="button"
        className={`${baseClasses} ${focusRingColor}`}
        style={variantStyles}
        onClick={onClick}
        tabIndex={tabIndex}
        aria-label={ariaLabel || `${category.name}カテゴリ`}
        {...props}
      >
        {showIcon && category.icon && (
          <span className={iconSizes[size]} role="img" aria-hidden="true">
            {category.icon}
          </span>
        )}
        <span>{category.name}</span>
      </button>
    )
  }

  return (
    <span
      className={baseClasses}
      style={variantStyles}
      role="img"
      aria-label={ariaLabel || `${category.name}カテゴリ`}
      {...props}
    >
      {showIcon && category.icon && (
        <span className={iconSizes[size]} role="img" aria-hidden="true">
          {category.icon}
        </span>
      )}
      <span>{category.name}</span>
    </span>
  )
}

// プリセットコンポーネント
export function CategoryPillSmall(props: Omit<CategoryPillProps, 'size'>) {
  return <CategoryPill {...props} size="sm" />
}

export function CategoryPillLarge(props: Omit<CategoryPillProps, 'size'>) {
  return <CategoryPill {...props} size="lg" />
}

export function CategoryPillOutlined(props: Omit<CategoryPillProps, 'variant'>) {
  return <CategoryPill {...props} variant="outlined" />
}

export function CategoryPillSoft(props: Omit<CategoryPillProps, 'variant'>) {
  return <CategoryPill {...props} variant="soft" />
} 