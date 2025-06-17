'use client'

import { useState, useEffect } from 'react'
import { ScheduleCategory } from '@/types'
import { getContrastColor, PRESET_COLORS, isValidHexColor } from '@/lib/colors'
import ColorPicker from '@/components/ui/ColorPicker'

interface CategoryManagerProps {
  isOpen: boolean
  onClose: () => void
  categories: ScheduleCategory[]
  onSave: (categories: ScheduleCategory[]) => void
}

interface CategoryFormData {
  id: string
  name: string
  color: string
  icon: string
}

export default function CategoryManager({
  isOpen,
  onClose,
  categories,
  onSave
}: CategoryManagerProps) {
  const [editingCategories, setEditingCategories] = useState<CategoryFormData[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)

  // 事前定義されたアイコンセット
  const availableIcons = [
    '💼', '📚', '🏃‍♂️', '🍽️', '🚗', '💤', '🎮', '🛒',
    '⚕️', '💪', '🎵', '📱', '🎨', '✈️', '🏠', '👥',
    '📝', '💰', '🌱', '🎯', '🔧', '📊', '🎪', '⭐'
  ]

  // 基本カテゴリテンプレート（プリセット色を使用）
  const generateDefaultCategories = (): CategoryFormData[] => {
    const templates = [
      { name: '仕事', icon: '💼' },
      { name: 'プライベート', icon: '🏠' },
      { name: '勉強', icon: '📚' },
      { name: '運動', icon: '🏃‍♂️' },
      { name: '食事', icon: '🍽️' },
      { name: '移動', icon: '🚗' },
      { name: '休憩', icon: '💤' },
      { name: 'その他', icon: '⭐' }
    ]

    return templates.map((template, index) => ({
      id: (index + 1).toString(),
      name: template.name,
      color: PRESET_COLORS[index % PRESET_COLORS.length],
      icon: template.icon
    }))
  }

  useEffect(() => {
    if (isOpen) {
      if (categories.length === 0) {
        setEditingCategories(generateDefaultCategories())
      } else {
        setEditingCategories(categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          icon: cat.icon || '⭐'
        })))
      }
      setErrors({})
    }
  }, [isOpen, categories])

  const addCategory = () => {
    const newId = Date.now().toString()
    
    // 未使用のプリセット色を取得
    const unusedColor = PRESET_COLORS.find(color => 
      !editingCategories.some(cat => cat.color === color)
    )
    
    const newCategory: CategoryFormData = {
      id: newId,
      name: '',
      color: unusedColor || PRESET_COLORS[editingCategories.length % PRESET_COLORS.length],
      icon: '⭐'
    }

    setEditingCategories(prev => [...prev, newCategory])
  }

  const updateCategory = (id: string, field: keyof CategoryFormData, value: string) => {
    setEditingCategories(prev =>
      prev.map(cat =>
        cat.id === id ? { ...cat, [field]: value } : cat
      )
    )

    // エラーをクリア
    if (errors[`${id}-${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`${id}-${field}`]
        return newErrors
      })
    }
  }

  const removeCategory = (id: string) => {
    setEditingCategories(prev => prev.filter(cat => cat.id !== id))
  }

  const validateCategories = () => {
    const newErrors: Record<string, string> = {}

    editingCategories.forEach(category => {
      // 名前のバリデーション
      if (!category.name.trim()) {
        newErrors[`${category.id}-name`] = 'カテゴリ名は必須です'
      } else if (category.name.length > 20) {
        newErrors[`${category.id}-name`] = 'カテゴリ名は20文字以内で入力してください'
      }

      // 重複チェック
      const duplicates = editingCategories.filter(cat => 
        cat.name.trim() === category.name.trim() && cat.id !== category.id
      )
      if (duplicates.length > 0) {
        newErrors[`${category.id}-name`] = 'このカテゴリ名は既に使用されています'
      }

      // 色のバリデーション
      if (!isValidHexColor(category.color)) {
        newErrors[`${category.id}-color`] = '正しいカラーコードを入力してください'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateCategories() || isSaving) return

    setIsSaving(true)
    try {
      const categoriesToSave: ScheduleCategory[] = editingCategories.map(cat => ({
        id: cat.id,
        userId: 'default-user', // デフォルトユーザーID（認証実装時に修正）
        name: cat.name.trim(),
        color: cat.color,
        icon: cat.icon
      }))

      await onSave(categoriesToSave)
      onClose()
    } catch (error) {
      console.error('カテゴリ保存エラー:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // プリセット色パレット（Claude Code実装済み）
  const colorPalette = [...PRESET_COLORS]

  // Claude Code実装済みのコントラスト計算
  const getTextColor = (bgColor: string) => getContrastColor(bgColor)

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-manager-title"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景オーバーレイ */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* モーダルコンテンツ */}
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 pt-6 pb-4 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <h3 id="category-manager-title" className="text-lg font-semibold text-gray-900">
                    カテゴリ管理
                  </h3>
                  <p className="text-sm text-gray-600">
                    スケジュールのカテゴリとカラーテーマを設定
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-white"
                aria-label="カテゴリ管理を閉じる"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* コンテンツ */}
          <div className="px-6 py-6">
            {/* カテゴリリスト */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {editingCategories.map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 items-start">
                    {/* カラープレビュー */}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-2">色</label>
                      <button
                        onClick={() => setShowColorPicker(showColorPicker === category.id ? null : category.id)}
                        className="w-full h-12 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors relative overflow-hidden"
                        style={{ backgroundColor: category.color }}
                        title="クリックして色を変更"
                      >
                        <span 
                          className="absolute inset-0 flex items-center justify-center text-sm font-medium"
                          style={{ color: getTextColor(category.color) }}
                        >
                          {category.color}
                        </span>
                      </button>
                      {errors[`${category.id}-color`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${category.id}-color`]}</p>
                      )}
                    </div>

                    {/* アイコン選択 */}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-2">アイコン</label>
                      <select
                        value={category.icon}
                        onChange={(e) => updateCategory(category.id, 'icon', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {availableIcons.map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>

                    {/* カテゴリ名 */}
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-gray-700 mb-2">カテゴリ名</label>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => updateCategory(category.id, 'name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors[`${category.id}-name`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="例: 仕事"
                        maxLength={20}
                      />
                      {errors[`${category.id}-name`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${category.id}-name`]}</p>
                      )}
                    </div>

                    {/* 削除ボタン */}
                    <div className="col-span-2 flex items-end">
                      <button
                        onClick={() => removeCategory(category.id)}
                        className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                        title="このカテゴリを削除"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* カラーピッカー */}
                  {showColorPicker === category.id && (
                    <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">色を選択</h4>
                      <div className="grid grid-cols-6 gap-2 mb-3">
                        {colorPalette.map(color => (
                          <button
                            key={color}
                            onClick={() => {
                              updateCategory(category.id, 'color', color)
                              setShowColorPicker(null)
                            }}
                            className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-700">カスタム:</label>
                        <input
                          type="color"
                          value={category.color}
                          onChange={(e) => updateCategory(category.id, 'color', e.target.value)}
                          className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={category.color}
                          onChange={(e) => updateCategory(category.id, 'color', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                          placeholder="#000000"
                          pattern="^#[0-9A-Fa-f]{6}$"
                        />
                      </div>
                    </div>
                  )}

                  {/* プレビュー */}
                  <div className="mt-3 p-2 rounded-lg" style={{ backgroundColor: category.color + '20' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.icon}</span>
                      <span className="text-sm font-medium" style={{ color: category.color }}>
                        {category.name || 'カテゴリ名'}
                      </span>
                      <span className="text-xs text-gray-500">のプレビュー</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 新しいカテゴリを追加 */}
            <button
              onClick={addCategory}
              className="mt-4 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新しいカテゴリを追加
            </button>
          </div>

          {/* フッター */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {editingCategories.length} 個のカテゴリ
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || Object.keys(errors).length > 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 