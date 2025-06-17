import OpenAI from 'openai'
import { AIConfig, AIError, AIResponse } from '@/types'

// デフォルト設定
const DEFAULT_CONFIG: AIConfig = {
  model: 'gpt-4o-mini',
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000
}

// レート制限管理
class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests = 50 // 毎分50リクエスト
  private readonly windowMs = 60000 // 1分

  async checkLimit(): Promise<void> {
    const now = Date.now()
    
    // 古いリクエストを削除
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = this.windowMs - (now - oldestRequest)
      
      const error: AIError = new Error(`レート制限に達しました。${Math.ceil(waitTime / 1000)}秒後に再試行してください。`) as AIError
      error.code = 'RATE_LIMIT_EXCEEDED'
      error.type = 'rate_limit'
      error.retryAfter = waitTime
      throw error
    }
    
    this.requests.push(now)
  }
}

class OpenAIClient {
  private client: OpenAI
  private rateLimiter: RateLimiter
  private config: AIConfig

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    this.client = new OpenAI({
      apiKey,
      timeout: this.config.timeout
    })
    
    this.rateLimiter = new RateLimiter()
  }

  private createAIError(error: any): AIError {
    const aiError = new Error() as AIError
    
    if (error.error) {
      // OpenAI API エラー
      aiError.message = error.error.message || 'OpenAI API エラー'
      aiError.code = error.error.code || 'api_error'
      aiError.statusCode = error.status
      
      switch (error.error.type) {
        case 'insufficient_quota':
        case 'rate_limit_exceeded':
          aiError.type = 'rate_limit'
          aiError.retryAfter = 60000 // 1分後に再試行
          break
        case 'invalid_request_error':
          aiError.type = 'invalid_request'
          break
        case 'timeout':
          aiError.type = 'timeout'
          break
        default:
          aiError.type = 'api_error'
      }
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      // タイムアウトエラー
      aiError.message = 'API接続がタイムアウトしました'
      aiError.code = 'TIMEOUT'
      aiError.type = 'timeout'
    } else {
      // その他のエラー
      aiError.message = error.message || '予期しないエラーが発生しました'
      aiError.code = 'UNKNOWN_ERROR'
      aiError.type = 'unknown'
    }

    return aiError
  }

  async chat(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: Partial<AIConfig> = {}
  ): Promise<AIResponse<string>> {
    const startTime = Date.now()
    
    try {
      await this.rateLimiter.checkLimit()
      
      const config = { ...this.config, ...options }
      
      const completion = await this.client.chat.completions.create({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('AIからの応答が空です')
      }

      return {
        success: true,
        data: response,
        metadata: {
          model: config.model,
          tokens: completion.usage?.total_tokens || 0,
          duration: Date.now() - startTime
        }
      }
    } catch (error) {
      console.error('OpenAI Chat Error:', error)
      
      return {
        success: false,
        error: this.createAIError(error).message,
        metadata: {
          model: this.config.model,
          tokens: 0,
          duration: Date.now() - startTime
        }
      }
    }
  }

  async chatStream(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: Partial<AIConfig> = {}
  ): Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk>> {
    try {
      await this.rateLimiter.checkLimit()
      
      const config = { ...this.config, ...options }
      
      const stream = await this.client.chat.completions.create({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        stream: true,
      })

      return stream
    } catch (error) {
      console.error('OpenAI Chat Stream Error:', error)
      throw this.createAIError(error)
    }
  }

  async generateTaskAnalysis(
    taskDescription: string,
    context?: {
      existingTasks?: any[]
      deadline?: string
      preferences?: any
    }
  ): Promise<AIResponse<any>> {
    const systemPrompt = `あなたは効率的なタスク管理のエキスパートです。
ユーザーのタスク説明を分析し、以下の形式でJSONレスポンスを返してください：

{
  "suggestedTasks": [
    {
      "title": "具体的なタスク名",
      "description": "詳細説明",
      "estimatedDuration": 分単位の数値,
      "priority": "high" | "medium" | "low",
      "category": "適切なカテゴリ"
    }
  ],
  "insights": ["改善提案や注意点"],
  "estimatedEffort": {
    "total": 総所要時間（分）,
    "breakdown": [{"task": "タスク名", "duration": 分数}]
  }
}

既存のタスクとの重複を避け、現実的で実行可能な提案をしてください。`

    const userMessage = `タスク内容: ${taskDescription}
${context?.existingTasks?.length ? `既存タスク: ${JSON.stringify(context.existingTasks, null, 2)}` : ''}
${context?.deadline ? `期限: ${context.deadline}` : ''}
${context?.preferences ? `設定: ${JSON.stringify(context.preferences, null, 2)}` : ''}`

    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ])
  }

  async generateScheduleSuggestion(
    tasks: any[],
    availableSlots: any[],
    preferences?: any,
    constraints?: any
  ): Promise<AIResponse<any>> {
    const systemPrompt = `あなたはスケジュール最適化のエキスパートです。
タスクと利用可能な時間枠を分析し、効率的なスケジュール配置を提案してください。

以下の形式でJSONレスポンスを返してください：
{
  "suggestedSchedules": [
    {
      "schedule": {
        "title": "タスク名",
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "date": "YYYY-MM-DD"
      },
      "score": 0-100の効率性スコア,
      "reasoning": "配置理由"
    }
  ],
  "conflicts": [
    {
      "task": "タスク名",
      "issue": "問題点",
      "suggestions": ["解決策"]
    }
  ],
  "summary": {
    "totalHours": 総時間,
    "efficiency": 効率性(0-100),
    "stress": ストレス度(0-100)
  }
}`

    const userMessage = `タスク一覧: ${JSON.stringify(tasks, null, 2)}
利用可能時間: ${JSON.stringify(availableSlots, null, 2)}
${preferences ? `設定: ${JSON.stringify(preferences, null, 2)}` : ''}
${constraints ? `制約: ${JSON.stringify(constraints, null, 2)}` : ''}`

    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ])
  }

  getConfig(): AIConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

// シングルトンインスタンス
let openaiClient: OpenAIClient | null = null

export function getOpenAIClient(config?: Partial<AIConfig>): OpenAIClient {
  if (!openaiClient) {
    openaiClient = new OpenAIClient(config)
  }
  return openaiClient
}

export { OpenAIClient }
export type { AIConfig, AIError, AIResponse }