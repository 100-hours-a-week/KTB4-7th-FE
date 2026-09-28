import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getTodaySolution,
  type SolutionCard,
  type SolutionTodayStatus,
} from '../features/solution/api/solutionApi'
import { EmptyState } from '../shared/ui/EmptyState'
import { AppShell } from '../shared/ui/AppShell'

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

function formatTargetDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function SolutionPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<SolutionTodayStatus | null>(null)
  const [message, setMessage] = useState('')
  const [storeName, setStoreName] = useState<string | null>(null)
  const [targetDate, setTargetDate] = useState<string | null>(null)
  const [bundleId, setBundleId] = useState<number | null>(null)
  const [cards, setCards] = useState<SolutionCard[]>([])
  const [helperText, setHelperText] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    setIsLoading(true)
    setError('')
    getTodaySolution()
      .then((response) => {
        if (ignore) return
        setStatus(response.status)
        setMessage(response.message)
        setStoreName(response.data.storeName)
        setTargetDate(response.data.targetDate)
        setBundleId(response.data.solutionBundleId)
        setCards(response.data.solutionCards)
        setHelperText(response.data.helperText ?? null)
      })
      .catch((requestError) => {
        if (ignore) return
        if (isUnauthorized(requestError)) {
          navigate('/login')
          return
        }
        setError('오늘의 솔루션을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [navigate])

  if (isLoading) {
    return (
      <AppShell title="솔루션">
        <p>불러오는 중...</p>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell title="솔루션">
        <EmptyState
          title="오늘의 솔루션을 불러오지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
        />
      </AppShell>
    )
  }

  if (status === 'EMPTY' || status === 'INSUFFICIENT_HISTORY') {
    return (
      <AppShell title="솔루션">
        <EmptyState
          title="아직 제공된 솔루션이 없습니다"
          description={
            helperText ||
            message ||
            '매출 데이터를 업로드하면 매장에 맞는 다음 행동을 제안해 드릴게요.'
          }
          action={<Link to="/sales/upload">매출 데이터 업로드</Link>}
        />
      </AppShell>
    )
  }

  if (status === 'PENDING' || status === 'GENERATING') {
    return (
      <AppShell title="솔루션">
        <EmptyState
          title="오늘의 솔루션을 생성하고 있습니다"
          description={message || '잠시 후 다시 확인해 주세요.'}
        />
      </AppShell>
    )
  }

  if (status === 'FAILED') {
    return (
      <AppShell title="솔루션">
        <EmptyState
          title="오늘의 솔루션을 불러오지 못했습니다"
          description={message || '잠시 후 다시 시도해 주세요.'}
        />
      </AppShell>
    )
  }

  const primary = cards[0]

  if (!primary || !bundleId) {
    return (
      <AppShell title="솔루션">
        <EmptyState
          title="아직 제공된 솔루션이 없습니다"
          description="매출 데이터를 업로드하면 매장에 맞는 다음 행동을 제안해 드릴게요."
          action={<Link to="/sales/upload">매출 데이터 업로드</Link>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell title="솔루션">
      <div className="solution-page">
        <section className="solution-lead">
          <p>오늘의 우선순위</p>
          <h1>
            {storeName}에<br />
            먼저 필요한 일
          </h1>
          <small>
            분석 기준 {targetDate ? formatTargetDate(targetDate) : ''}
          </small>
        </section>
        {helperText && (
          <section className="solution-helper-text">
            <h2>솔루션 안내</h2>
            <p>{helperText}</p>
          </section>
        )}
        <div className="solution-list">
          {cards.map((card, index) => (
            <Link key={card.id} to={`/solution/${bundleId}/${card.id}`}>
              <span className="solution-row-no">0{index + 1}</span>
              <span className="solution-row-body">
                <strong>{card.title}</strong>
                <small>{card.summaryText}</small>
              </span>
            </Link>
          ))}
        </div>
        <Link className="light-button solution-chat-link" to="/solution/chat">
          AI에게 질문하기
        </Link>
      </div>
    </AppShell>
  )
}
