'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, User, Sparkles, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { ChatMessage, TaskSuggestion, Task } from '@/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface AIChatModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskAccept?: (task: Partial<Task>) => void
  onScheduleAccept?: (suggestion: any) => void
}

export default function AIChatModal({ isOpen, onClose, onTaskAccept, onScheduleAccept }: AIChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'こんにちは！タスクやスケジュールについて何でもお聞きください。自然な言葉で話しかけてくださいね。',
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setError(null)

    try {
      // TODO: Claude Codeが実装する予定のAPIを呼び出し
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          conversationId: 'default',
        }),
      })

      if (!response.ok) {
        throw new Error('AIとの通信に失敗しました')
      }

      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: data.content || data.message || 'すみません、回答を生成できませんでした。',
        timestamp: new Date(),
        metadata: data.metadata,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      
      // エラーメッセージをチャットに表示
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: '申し訳ございません。現在AIサービスが利用できません。しばらくしてからもう一度お試しください。',
        timestamp: new Date(),
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTaskAccept = (task: Partial<Task>) => {
    if (onTaskAccept) {
      onTaskAccept(task)
      // 受け入れメッセージを追加
      const acceptMessage: ChatMessage = {
        id: Date.now().toString() + '_accept',
        role: 'assistant',
        content: `「${task.title}」をタスクリストに追加しました！`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, acceptMessage])
    }
  }

  const renderTaskSuggestion = (suggestion: TaskSuggestion) => (
    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="font-medium text-blue-900 mb-2 flex items-center">
        <Sparkles className="w-4 h-4 mr-1" />
        タスク提案
      </h4>
      <div className="space-y-2">
        <div>
          <p className="font-medium text-gray-900">{suggestion.task.title}</p>
          {suggestion.task.description && (
            <p className="text-sm text-gray-600">{suggestion.task.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {suggestion.task.estimatedDuration && (
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {suggestion.task.estimatedDuration}分
            </div>
          )}
          {suggestion.task.priority && (
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              suggestion.task.priority === 'high' ? 'bg-red-100 text-red-800' :
              suggestion.task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {suggestion.task.priority === 'high' ? '高' :
               suggestion.task.priority === 'medium' ? '中' : '低'}優先度
            </div>
          )}
        </div>

        {suggestion.suggestedTimeSlots.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">提案時間:</p>
            <div className="space-y-1">
              {suggestion.suggestedTimeSlots.slice(0, 3).map((slot, index) => (
                <div key={index} className="text-sm text-gray-600">
                  {format(slot.date, 'M月d日(E)', { locale: ja })} {slot.startTime} - {slot.endTime}
                  <span className="ml-2 text-xs text-blue-600">
                    (信頼度: {Math.round(slot.confidence * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handleTaskAccept(suggestion.task)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            タスクに追加
          </button>
          <button className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors">
            詳細編集
          </button>
        </div>
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Bot className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">AI アシスタント</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* メッセージ一覧 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-blue-600 ml-2' : 'bg-gray-200 mr-2'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className={`rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {format(message.timestamp, 'HH:mm')}
                  </p>
                  
                  {/* タスク提案の表示 */}
                  {message.metadata?.suggestedTask && (
                    <div className="mt-2">
                      {renderTaskSuggestion({
                        task: message.metadata.suggestedTask,
                        suggestedTimeSlots: [],
                        reasoning: 'AI提案',
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* ローディング表示 */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <div className="flex items-center text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          </div>
        )}

        {/* 入力エリア */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="メッセージを入力してください..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enterで送信、Shift+Enterで改行
          </p>
        </div>
      </div>
    </div>
  )
} 