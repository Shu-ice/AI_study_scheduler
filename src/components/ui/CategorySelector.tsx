'use client'

import { useState, useRef, useEffect } from 'react'
import { ScheduleCategory } from '@/types'
import CategoryPill from './CategoryPill'

interface CategorySelectorProps {
  categories: ScheduleCategory[]
  selectedCategory?: ScheduleCategory | null
  onSelect: (category: ScheduleCategory | null) => void
  placeholder?: string
  searchable?: boolean
  clearable?: boolean
  disabled?: boolean
  className?: string
  variant?: 'default' | 'compact'
  'aria-label'?: string
}

export default function CategorySelector({
  categories,
  selectedCategory,
  onSelect,
  placeholder = 'カテゴリを選択',
  searchable = true,
  clearable = true,
  disabled = false,
  className = '',
  variant = 'default',
  'aria-label': ariaLabel,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 検索結果でフィルタリング
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 外側クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ドロップダウンが開いたら検索入力にフォーカス
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  // キーボードナビゲーション
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else if (focusedIndex >= 0 && focusedIndex < filteredCategories.length) {
          handleSelect(filteredCategories[focusedIndex])
        }
        break

      case 'Escape':
        setIsOpen(false)
        setSearchTerm('')
        setFocusedIndex(-1)
        break

      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setFocusedIndex(prev => 
            prev < filteredCategories.length - 1 ? prev + 1 : 0
          )
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCategories.length - 1
          )
        }
        break

      case 'Tab':
        if (isOpen) {
          setIsOpen(false)
          setSearchTerm('')
          setFocusedIndex(-1)
        }
        break
    }
  }

  const handleSelect = (category: ScheduleCategory | null) => {
    onSelect(category)
    setIsOpen(false)
    setSearchTerm('')
    setFocusedIndex(-1)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleSelect(null)
  }

  const toggleDropdown = () => {
    if (disabled) return
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm('')
      setFocusedIndex(-1)
    }
  }

  // バリエーションクラス
  const variantClasses = {
    default: 'min-h-[44px] px-4 py-2',
    compact: 'min-h-[36px] px-3 py-1.5 text-sm'
  }

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
    >
      {/* セレクターボタン */}
      <button
        type="button"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full border border-gray-300 rounded-lg bg-white text-left
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200 flex items-center justify-between
          ${variantClasses[variant]}
          ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || 'カテゴリ選択'}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedCategory ? (
            <CategoryPill
              category={selectedCategory}
              size={variant === 'compact' ? 'sm' : 'md'}
              variant="soft"
              showIcon={true}
            />
          ) : (
            <span className="text-gray-500 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 ml-2">
          {clearable && selectedCategory && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="選択をクリア"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* ドロップダウンコンテンツ */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden"
          role="listbox"
          aria-label="カテゴリ一覧"
        >
          {/* 検索ボックス */}
          {searchable && (
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setFocusedIndex(-1)
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="カテゴリを検索..."
                />
              </div>
            </div>
          )}

          {/* カテゴリリスト */}
          <div className="max-h-48 overflow-y-auto">
            {/* クリア選択肢 */}
            {clearable && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`
                  w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors
                  flex items-center gap-2 text-gray-600
                  ${focusedIndex === -1 ? 'bg-blue-50' : ''}
                `}
                role="option"
                aria-selected={selectedCategory === null}
              >
                <span className="text-gray-400">×</span>
                <span className="text-sm">カテゴリなし</span>
              </button>
            )}

            {/* カテゴリ項目 */}
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category, index) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelect(category)}
                  className={`
                    w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors
                    flex items-center gap-2
                    ${index === focusedIndex ? 'bg-blue-50' : ''}
                    ${selectedCategory?.id === category.id ? 'bg-blue-100' : ''}
                  `}
                  role="option"
                  aria-selected={selectedCategory?.id === category.id}
                >
                  <CategoryPill
                    category={category}
                    size="sm"
                    variant="soft"
                    showIcon={true}
                  />
                  {selectedCategory?.id === category.id && (
                    <svg className="w-4 h-4 text-blue-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-gray-500 text-sm">
                <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {searchTerm ? '該当するカテゴリが見つかりません' : 'カテゴリがありません'}
              </div>
            )}
          </div>

          {/* フッター（カテゴリ管理ボタン） */}
          <div className="border-t border-gray-200 p-2">
            <button
              type="button"
              className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-2"
              onClick={() => {
                setIsOpen(false)
                // TODO: カテゴリ管理モーダルを開く処理
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              カテゴリを管理
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 