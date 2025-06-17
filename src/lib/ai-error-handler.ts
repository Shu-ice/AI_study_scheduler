import { AIError, AIUsageStats } from '@/types'

// エラーログのインターフェース
interface ErrorLog {
  timestamp: Date
  error: AIError
  context: {
    endpoint: string
    userId?: string
    requestId?: string
    requestData?: any
  }
  resolved: boolean
}

// 使用統計の管理
class AIUsageTracker {
  private stats: AIUsageStats = {
    requestCount: 0,
    totalTokens: 0,
    averageResponseTime: 0,
    errorRate: 0,
    lastUsed: new Date()
  }
  
  private responseTimes: number[] = []
  private errorCount = 0

  recordRequest(responseTime: number, tokens: number = 0, hasError: boolean = false): void {
    this.stats.requestCount++
    this.stats.totalTokens += tokens
    this.responseTimes.push(responseTime)
    this.stats.lastUsed = new Date()
    
    if (hasError) {
      this.errorCount++
    }

    // 平均応答時間を計算（最新100件まで）
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100)
    }
    this.stats.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length

    // エラー率を計算
    this.stats.errorRate = (this.errorCount / this.stats.requestCount) * 100
  }

  getStats(): AIUsageStats {
    return { ...this.stats }
  }

  reset(): void {
    this.stats = {
      requestCount: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastUsed: new Date()
    }
    this.responseTimes = []
    this.errorCount = 0
  }
}

// エラーハンドラークラス
class AIErrorHandler {
  private errorLogs: ErrorLog[] = []
  private usageTracker: AIUsageTracker
  private maxLogSize = 1000

  constructor() {
    this.usageTracker = new AIUsageTracker()
  }

  // カスタムAIエラーの作成
  createAIError(
    message: string,
    code: string,
    type: AIError['type'],
    statusCode?: number,
    retryAfter?: number
  ): AIError {
    const error = new Error(message) as AIError
    error.code = code
    error.type = type
    error.statusCode = statusCode
    error.retryAfter = retryAfter
    return error
  }

  // エラーのログ記録
  logError(
    error: AIError,
    context: {
      endpoint: string
      userId?: string
      requestId?: string
      requestData?: any
    }
  ): void {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      error: {
        ...error,
        message: error.message,
        stack: error.stack
      },
      context,
      resolved: false
    }

    this.errorLogs.push(errorLog)

    // ログサイズの制限
    if (this.errorLogs.length > this.maxLogSize) {
      this.errorLogs = this.errorLogs.slice(-this.maxLogSize)
    }

    // コンソールに詳細ログを出力
    console.error('AI Error:', {
      message: error.message,
      code: error.code,
      type: error.type,
      statusCode: error.statusCode,
      context,
      timestamp: errorLog.timestamp.toISOString()
    })

    // 使用統計に記録
    this.usageTracker.recordRequest(0, 0, true)
  }

  // 成功記録
  logSuccess(
    responseTime: number,
    tokens: number = 0,
    context: {
      endpoint: string
      userId?: string
      requestId?: string
    }
  ): void {
    this.usageTracker.recordRequest(responseTime, tokens, false)
    
    console.log('AI Success:', {
      endpoint: context.endpoint,
      responseTime: `${responseTime}ms`,
      tokens,
      timestamp: new Date().toISOString()
    })
  }

  // エラーの種類に応じた適切な処理
  handleError(error: any, context: any): AIError {
    let aiError: AIError

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      aiError = this.createAIError(
        'API接続がタイムアウトしました',
        'TIMEOUT',
        'timeout'
      )
    } else if (error.response?.status === 429) {
      aiError = this.createAIError(
        'API使用量の制限に達しました',
        'RATE_LIMIT_EXCEEDED',
        'rate_limit',
        429,
        60000 // 1分後に再試行
      )
    } else if (error.response?.status === 401) {
      aiError = this.createAIError(
        'API認証に失敗しました',
        'UNAUTHORIZED',
        'api_error',
        401
      )
    } else if (error.response?.status === 400) {
      aiError = this.createAIError(
        'リクエストの形式が無効です',
        'INVALID_REQUEST',
        'invalid_request',
        400
      )
    } else if (error.response?.status >= 500) {
      aiError = this.createAIError(
        'サーバーエラーが発生しました',
        'SERVER_ERROR',
        'api_error',
        error.response.status
      )
    } else {
      aiError = this.createAIError(
        error.message || '予期しないエラーが発生しました',
        'UNKNOWN_ERROR',
        'unknown'
      )
    }

    this.logError(aiError, context)
    return aiError
  }

  // 再試行可能なエラーかどうかを判定
  isRetryableError(error: AIError): boolean {
    return ['timeout', 'rate_limit', 'api_error'].includes(error.type) &&
           error.statusCode !== 401 && // 認証エラーは再試行不可
           error.statusCode !== 400    // リクエストエラーは再試行不可
  }

  // 再試行の遅延時間を計算
  getRetryDelay(error: AIError, attempt: number): number {
    if (error.retryAfter) {
      return error.retryAfter
    }

    // 指数バックオフ
    const baseDelay = 1000 // 1秒
    return Math.min(baseDelay * Math.pow(2, attempt), 30000) // 最大30秒
  }

  // エラー統計の取得
  getErrorStats(): {
    totalErrors: number
    errorsByType: Record<string, number>
    recentErrors: ErrorLog[]
    usageStats: AIUsageStats
  } {
    const errorsByType: Record<string, number> = {}
    
    this.errorLogs.forEach(log => {
      errorsByType[log.error.type] = (errorsByType[log.error.type] || 0) + 1
    })

    const recentErrors = this.errorLogs
      .filter(log => Date.now() - log.timestamp.getTime() < 24 * 60 * 60 * 1000) // 24時間以内
      .slice(-10) // 最新10件

    return {
      totalErrors: this.errorLogs.length,
      errorsByType,
      recentErrors,
      usageStats: this.usageTracker.getStats()
    }
  }

  // エラーログのクリア
  clearLogs(): void {
    this.errorLogs = []
    this.usageTracker.reset()
  }

  // 特定のエラーを解決済みとしてマーク
  markErrorResolved(errorIndex: number): void {
    if (this.errorLogs[errorIndex]) {
      this.errorLogs[errorIndex].resolved = true
    }
  }
}

// 自動再試行機能付きのAPI呼び出しラッパー
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: {
    endpoint: string
    userId?: string
    requestId?: string
  },
  maxRetries: number = 3
): Promise<T> {
  const startTime = Date.now()
  let lastError: AIError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      
      // 成功をログに記録
      aiErrorHandler.logSuccess(
        Date.now() - startTime,
        0, // tokens は operation 内で記録
        context
      )
      
      return result
    } catch (error) {
      lastError = aiErrorHandler.handleError(error, {
        ...context,
        attempt: attempt + 1
      })

      // 最後の試行でない場合、再試行可能かチェック
      if (attempt < maxRetries && aiErrorHandler.isRetryableError(lastError)) {
        const delay = aiErrorHandler.getRetryDelay(lastError, attempt)
        console.log(`Retrying after ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // 再試行不可または最後の試行
      break
    }
  }

  throw lastError!
}

// ユーティリティ関数：ユーザーフレンドリーなエラーメッセージを生成
export function getErrorMessage(error: AIError): string {
  switch (error.type) {
    case 'rate_limit':
      return 'API使用量の制限に達しました。しばらくお待ちください。'
    case 'timeout':
      return '処理に時間がかかっています。再度お試しください。'
    case 'invalid_request':
      return '入力内容を確認して、再度お試しください。'
    case 'api_error':
      if (error.statusCode === 401) {
        return 'API認証に問題があります。管理者にお問い合わせください。'
      }
      return 'AIサービスに一時的な問題が発生しています。'
    default:
      return '予期しないエラーが発生しました。再度お試しください。'
  }
}

// シングルトンインスタンス
const aiErrorHandler = new AIErrorHandler()

export { AIErrorHandler, aiErrorHandler }
export type { ErrorLog }