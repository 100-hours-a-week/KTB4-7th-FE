import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getChatErrorMessage,
  getChatHistory,
  isInsufficientData,
  streamChatMessage,
  type ChatMessage,
} from '../features/chat/api/chatApi'
import { AppShell } from '../shared/ui/AppShell'

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

let localMessageId = -1
function nextLocalMessageId() {
  return localMessageId--
}

export function SolutionChatPage() {
  const navigate = useNavigate()
  const [serviceGuide, setServiceGuide] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [recommendedQuestions, setRecommendedQuestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [pageError, setPageError] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const loadHistory = () =>
    getChatHistory().then((response) => {
      setServiceGuide(response.data.serviceGuide)
      setMessages(response.data.messages)
      setRecommendedQuestions(response.data.recommendedQuestions)
    })

  useEffect(() => {
    let ignore = false
    setIsLoading(true)
    loadHistory()
      .catch((requestError) => {
        if (ignore) return
        if (isUnauthorized(requestError)) {
          navigate('/login')
          return
        }
        setPageError('대화를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const handleSend = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || isSending) return

    setIsSending(true)
    setPageError('')
    setInputValue('')
    setMessages((previous) => [
      ...previous,
      {
        id: nextLocalMessageId(),
        role: 'USER',
        content: trimmed,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      },
      {
        id: nextLocalMessageId(),
        role: 'ASSISTANT',
        content: '',
        status: 'STREAMING',
        createdAt: new Date().toISOString(),
      },
    ])

    try {
      await streamChatMessage({ content: trimmed }, (event) => {
        setMessages((previous) => {
          const updated = [...previous]
          const lastIndex = updated.length - 1
          const last = updated[lastIndex]
          updated[lastIndex] =
            event.event === 'error'
              ? { ...last, id: event.data.messageId, status: 'FAILED' }
              : {
                  ...last,
                  id: event.data.messageId,
                  status: 'STREAMING',
                  content: last.content + event.data.content,
                }
          return updated
        })
      })
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        navigate('/login')
        return
      }
      setMessages((previous) => previous.slice(0, -2))
      setInputValue(trimmed)
      setPageError(
        isInsufficientData(requestError)
          ? '매출 이력이 더 쌓이면 챗봇을 이용할 수 있어요.'
          : getChatErrorMessage(
              requestError,
              '답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.',
            ),
      )
      setIsSending(false)
      return
    }

    try {
      await loadHistory()
    } catch {
      // 재조회 실패는 화면에 남은 스트리밍 결과를 그대로 둔다
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AppShell
      title="AI 채팅"
      backTo="/solution"
      contentClassName="chat-app-content"
    >
      <div className="chat-page">
        <header className="chat-page-header">
          <p>MEMME AI</p>
          <h1>오늘의 솔루션, 무엇이든 물어보세요</h1>
          {serviceGuide && <small>{serviceGuide}</small>}
          {pageError && (
            <p className="form-error" role="alert">
              {pageError}
            </p>
          )}
        </header>
        {isLoading ? (
          <p>불러오는 중...</p>
        ) : (
          <>
            <div className="chat-messages" aria-label="대화 내용">
              {messages.map((item) => (
                <p key={item.id} className={item.role === 'USER' ? 'user' : ''}>
                  {item.status === 'FAILED'
                    ? '답변 생성에 실패했습니다.'
                    : item.content ||
                      (item.status === 'STREAMING' ? '답변 작성 중...' : '')}
                </p>
              ))}
              {messages.length === 0 && recommendedQuestions.length > 0 && (
                <div className="chat-recommended-questions">
                  {recommendedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleSend(question)}
                      disabled={isSending}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                handleSend(inputValue)
              }}
            >
              <label>
                메시지 입력
                <input
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="궁금한 점을 입력하세요"
                  disabled={isSending}
                />
              </label>
              <button type="submit" disabled={isSending}>
                {isSending ? '전송 중...' : '전송'}
              </button>
            </form>
          </>
        )}
      </div>
    </AppShell>
  )
}
