import {
  csrfCookieName,
  csrfHeaderName,
  getCookieValue,
  http,
} from '../../../shared/api/http'
import { getApiBaseUrl } from '../../../shared/config/env'

export class ChatRequestError extends Error {
  response: { status: number; data: unknown }

  constructor(status: number, data: unknown, message?: string) {
    super(message ?? `chat request failed with status ${status}`)
    this.name = 'ChatRequestError'
    this.response = { status, data }
  }
}

export type ChatMessageRole = 'USER' | 'ASSISTANT'
export type ChatMessageStatus = 'PENDING' | 'STREAMING' | 'COMPLETED' | 'FAILED'

export type ChatMessage = {
  id: number
  role: ChatMessageRole
  content: string
  status: ChatMessageStatus
  createdAt: string
}

export type ChatHistoryResponse = {
  message: string
  data: {
    chatDate: string
    serviceGuide: string
    messages: ChatMessage[]
    recommendedQuestions: string[]
  }
}

export async function getChatHistory() {
  return (await http.get<ChatHistoryResponse>('/v1/chat/messages')).data
}

export type ChatAnswerChunkEvent = {
  event: 'answerChunk'
  data: { messageId: number; content: string; evidence: unknown }
}

export type ChatErrorEvent = {
  event: 'error'
  data: { messageId: number; code: string; message: string }
}

export type ChatStreamEvent = ChatAnswerChunkEvent | ChatErrorEvent

export type SendChatMessageRequest = {
  content: string
  retryOfMessageId?: number | null
}

// 채팅 응답은 SSE(text/event-stream) 스트리밍이라 axios 인스턴스가 아니라
// fetch로 직접 호출한다. CSRF 헤더/쿠키 처리는 shared/api/http.ts의 로직을
// 그대로 재사용한다.
export async function streamChatMessage(
  request: SendChatMessageRequest,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  const csrfToken = getCookieValue(csrfCookieName)
  const response = await fetch(
    `${getApiBaseUrl(import.meta.env)}/v1/chat/messages`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(csrfToken
          ? { [csrfHeaderName]: decodeURIComponent(csrfToken) }
          : {}),
      },
      body: JSON.stringify({
        content: request.content,
        retryOfMessageId: request.retryOfMessageId ?? null,
      }),
    },
  )

  const contentType = response.headers.get('content-type') ?? ''

  // prepare() 단계에서 거절되면(409/403/422, 혹은 200 INSUFFICIENT_DATA)
  // 스트리밍이 아니라 일반 JSON 응답으로 내려온다.
  if (!response.ok || !contentType.includes('text/event-stream')) {
    let data: unknown = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    throw new ChatRequestError(response.status, data)
  }

  if (!response.body) {
    throw new ChatRequestError(
      response.status,
      null,
      '스트리밍 응답을 읽을 수 없습니다.',
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true })

    let separatorIndex = buffer.indexOf('\n\n')
    while (separatorIndex !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex)
      buffer = buffer.slice(separatorIndex + 2)
      const line = rawEvent.startsWith('data:')
        ? rawEvent.slice('data:'.length).trim()
        : rawEvent.trim()
      if (line === '[DONE]') return
      if (line) {
        try {
          onEvent(JSON.parse(line) as ChatStreamEvent)
        } catch {
          // 파싱할 수 없는 조각은 건너뛴다
        }
      }
      separatorIndex = buffer.indexOf('\n\n')
    }
  }
}

export function isInsufficientData(error: unknown): boolean {
  if (!(error instanceof ChatRequestError)) return false
  const data = error.response.data
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { status?: string }).status === 'INSUFFICIENT_DATA'
  )
}

export function getChatErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ChatRequestError) {
    const data = error.response.data
    if (typeof data === 'object' && data !== null) {
      const message = (data as { message?: string }).message
      if (typeof message === 'string' && message) return message
    }
  }
  return fallback
}
