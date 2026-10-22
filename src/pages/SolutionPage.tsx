import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getTodaySolution,
  retryTodaySolution,
  type SolutionCard,
  type SolutionTodayStatus,
} from '../features/solution/api/solutionApi'
import { EmptyState } from '../shared/ui/EmptyState'
import { AppShell } from '../shared/ui/AppShell'
import { getSolutionCardKeyword } from './solutionCardVisual'

const SOLUTION_PREPARING_MESSAGE = '오늘의 솔루션을 준비하고 있습니다.'
const LEGACY_SOLUTION_PREPARING_MESSAGE =
  '오늘의 솔루션은 매일 자정에 준비됩니다.'

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

function isSolutionInProgress(
  status: SolutionTodayStatus | null,
  message: string,
) {
  return (
    status === 'PENDING' ||
    status === 'GENERATING' ||
    (status === 'EMPTY' && message === SOLUTION_PREPARING_MESSAGE)
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
  const retryInFlight = useRef(false)
  const [status, setStatus] = useState<SolutionTodayStatus | null>(null)
  const [message, setMessage] = useState('')
  const [storeName, setStoreName] = useState<string | null>(null)
  const [targetDate, setTargetDate] = useState<string | null>(null)
  const [bundleId, setBundleId] = useState<number | null>(null)
  const [cards, setCards] = useState<SolutionCard[]>([])
  const [helperText, setHelperText] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let ignore = false
    let refreshTimer: number | undefined
    if (refreshKey === 0) setIsLoading(true)
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
        if (isSolutionInProgress(response.status, response.message)) {
          refreshTimer = window.setTimeout(() => {
            if (!ignore) setRefreshKey((previous) => previous + 1)
          }, 3000)
        }
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
        if (!ignore) {
          if (refreshKey === 0) setIsLoading(false)
          setIsRetrying(false)
          retryInFlight.current = false
        }
      })
    return () => {
      ignore = true
      if (refreshTimer) window.clearTimeout(refreshTimer)
    }
  }, [navigate, refreshKey])

  async function handleRetry() {
    if (status !== 'FAILED' || retryInFlight.current) return
    retryInFlight.current = true
    setIsRetrying(true)
    setRetryError(null)
    try {
      await retryTodaySolution()
      setRefreshKey((previous) => previous + 1)
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        retryInFlight.current = false
        setIsRetrying(false)
        navigate('/login')
        return
      }
      const response =
        typeof requestError === 'object' &&
        requestError !== null &&
        'response' in requestError
          ? (
              requestError as {
                response?: {
                  status?: number
                  data?: { status?: string; message?: string }
                }
              }
            ).response
          : undefined
      if (
        response?.status === 409 &&
        (response.data?.status === 'IN_PROGRESS' ||
          response.data?.status === 'NOT_ALLOWED')
      ) {
        setRefreshKey((previous) => previous + 1)
        return
      }
      setRetryError(
        response?.data?.message ??
          '솔루션 재시도에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      )
      retryInFlight.current = false
      setIsRetrying(false)
    }
  }

  if (isLoading) {
    return (
      <AppShell title="솔루션">
        <div className="solution-page solution-status-page">
          <section
            className="solution-status-modal solution-status-modal--progress"
            role="status"
            aria-live="polite"
          >
            <p className="solution-status-kicker">STATUS REPORT / 01</p>
            <p className="solution-status-icon" aria-hidden="true">
              …
            </p>
            <h2>오늘의 솔루션을 생성하고 있어요</h2>
            <p>오늘의 솔루션 상태를 확인하고 있습니다.</p>
          </section>
        </div>
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

  const isInProgress = isSolutionInProgress(status, message)

  if (status === 'EMPTY' && message === LEGACY_SOLUTION_PREPARING_MESSAGE) {
    return (
      <AppShell title="솔루션" contentClassName="solution-empty-content">
        <EmptyState
          title="오늘의 솔루션을 준비하고 있어요"
          description="오늘의 솔루션을 준비 중입니다. 잠시 후 다시 확인해 주세요."
        />
      </AppShell>
    )
  }

  if (status === 'FORECAST_OUT_OF_RANGE') {
    return (
      <AppShell title="솔루션" contentClassName="solution-empty-content">
        <EmptyState
          title="최근 매출 데이터가 필요합니다"
          description={message}
          supportingText={helperText}
          action={<Link to="/sales/upload">매출 데이터 업로드</Link>}
        />
      </AppShell>
    )
  }

  if (
    (status === 'EMPTY' && !isInProgress) ||
    status === 'INSUFFICIENT_HISTORY'
  ) {
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

  if (isInProgress || status === 'FAILED') {
    return (
      <AppShell
        title="솔루션"
        contentClassName={
          status === 'EMPTY' ? 'solution-empty-content' : undefined
        }
      >
        <div className="solution-page solution-status-page">
          <section
            className={`solution-status-modal solution-status-modal--${
              isInProgress ? 'progress' : 'failed'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="solution-status-title"
          >
            <p className="solution-status-kicker">
              {isInProgress ? 'STATUS REPORT / 01' : 'ISSUE REPORT / 01'}
            </p>
            <p className="solution-status-icon" aria-hidden="true">
              {isInProgress ? '…' : '!'}
            </p>
            <h2 id="solution-status-title">
              {isInProgress
                ? status === 'EMPTY'
                  ? '오늘의 솔루션을 준비하고 있어요'
                  : '오늘의 솔루션을 생성하고 있어요'
                : '솔루션 생성에 실패했어요'}
            </h2>
            <p>
              {message ||
                (isInProgress
                  ? '잠시만 기다리면 준비된 솔루션을 보여드릴게요.'
                  : '잠시 후 다시 확인해 주세요.')}
            </p>
            {!isInProgress && helperText && (
              <div className="solution-status-note">
                <span>DATA NOTE</span>
                <p>{helperText}</p>
              </div>
            )}
            {isInProgress ? (
              <span className="solution-status-polling">
                자동으로 확인하고 있어요
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className="primary-action"
                  disabled={isRetrying}
                  onClick={handleRetry}
                >
                  <span>{isRetrying ? '확인 중...' : '다시 확인하기'}</span>
                  <span aria-hidden="true">→</span>
                </button>
                {retryError && <p role="alert">{retryError}</p>}
                {isRetrying && (
                  <p
                    role="status"
                    aria-live="polite"
                    aria-label="솔루션 상태 확인 중"
                  >
                    솔루션 상태를 확인하고 있어요.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </AppShell>
    )
  }

  if (cards.length === 0 || !bundleId) {
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
    <SolutionResults
      storeName={storeName}
      targetDate={targetDate}
      bundleId={bundleId}
      cards={cards}
      helperText={helperText}
    />
  )
}

function SolutionResults({
  storeName,
  targetDate,
  bundleId,
  cards,
  helperText,
}: {
  storeName: string | null
  targetDate: string | null
  bundleId: number
  cards: SolutionCard[]
  helperText: string | null
}) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const settleTimerRef = useRef<number | undefined>(undefined)
  const [activeIndex, setActiveIndex] = useState(0)
  const isCarousel = cards.length > 1
  const visibleCards = isCarousel ? [...cards, ...cards, ...cards] : cards

  function getSlideStep(element: HTMLDivElement) {
    const first = element.children[0] as HTMLElement | undefined
    const second = element.children[1] as HTMLElement | undefined
    return first && second ? second.offsetLeft - first.offsetLeft : 0
  }

  useLayoutEffect(() => {
    const element = carouselRef.current
    if (!element || !isCarousel) return
    element.scrollLeft = getSlideStep(element) * cards.length
  }, [cards.length, isCarousel])

  useEffect(() => () => window.clearTimeout(settleTimerRef.current), [])

  function handleCarouselScroll(element: HTMLDivElement) {
    const step = getSlideStep(element)
    if (!step) return
    const position = Math.round(element.scrollLeft / step)
    setActiveIndex(((position % cards.length) + cards.length) % cards.length)
    window.clearTimeout(settleTimerRef.current)
    settleTimerRef.current = window.setTimeout(() => {
      const settledPosition = Math.round(element.scrollLeft / step)
      if (settledPosition < cards.length) {
        element.scrollLeft += cards.length * step
      } else if (settledPosition >= cards.length * 2) {
        element.scrollLeft -= cards.length * step
      }
    }, 140)
  }

  function goToCard(index: number) {
    const element = carouselRef.current
    if (!element) return
    const step = getSlideStep(element)
    const position = Math.round(element.scrollLeft / step)
    const currentIndex =
      ((position % cards.length) + cards.length) % cards.length
    const difference = index - currentIndex
    const shortestDifference =
      Math.abs(difference) > cards.length / 2
        ? difference > 0
          ? difference - cards.length
          : difference + cards.length
        : difference
    element.scrollTo({
      left: element.scrollLeft + shortestDifference * step,
      behavior: 'smooth',
    })
  }

  return (
    <AppShell title="솔루션">
      <div className="solution-results">
        <section
          className="solution-results-intro"
          aria-labelledby="solution-results-title"
        >
          <p className="solution-results-eyebrow">
            {storeName || '우리 매장'} 맞춤 제안
          </p>
          <h1 id="solution-results-title">오늘의 솔루션</h1>
          {targetDate && (
            <p className="solution-results-date">
              분석 기준 {formatTargetDate(targetDate)}
            </p>
          )}
        </section>

        <section
          className="solution-results-priorities"
          aria-labelledby="solution-priorities-title"
        >
          <div className="solution-results-section-heading">
            <div>
              <span className="solution-results-section-kicker">
                TODAY'S PRIORITIES
              </span>
              <h2 id="solution-priorities-title">먼저 해볼 일</h2>
            </div>
            <span className="solution-results-count">
              {cards.length}가지 제안
            </span>
          </div>
          <div
            className="solution-results-list"
            ref={carouselRef}
            onScroll={(event) => handleCarouselScroll(event.currentTarget)}
            aria-label="오늘의 솔루션 카드"
          >
            {visibleCards.map((card, position) => {
              const index = position % cards.length
              const keyword = getSolutionCardKeyword(card.title)
              const isCopy =
                isCarousel && Math.floor(position / cards.length) !== 1
              return (
                <Link
                  className={`solution-results-card${index === 0 ? ' solution-results-card--first' : ''}`}
                  key={`${position}-${card.id}`}
                  to={`/solution/${bundleId}/${card.id}`}
                  aria-hidden={isCopy || undefined}
                  tabIndex={isCopy ? -1 : undefined}
                >
                  <div className="solution-results-card-top">
                    <span className="solution-results-card-rank">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {index === 0 && (
                      <span className="solution-results-card-badge">
                        가장 먼저
                      </span>
                    )}
                  </div>
                  <p className="solution-results-card-keyword">{keyword}</p>
                  <div className="solution-results-card-copy">
                    <h3>{card.title}</h3>
                    <p>{card.summaryText}</p>
                  </div>
                  <span
                    className="solution-results-card-arrow"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                </Link>
              )
            })}
          </div>
          {isCarousel && (
            <div className="solution-results-carousel-controls">
              <div
                className="solution-results-carousel-dots"
                aria-label="솔루션 선택"
              >
                {cards.map((card, index) => (
                  <button
                    type="button"
                    key={card.id}
                    className={index === activeIndex ? 'is-active' : ''}
                    onClick={() => goToCard(index)}
                    aria-label={`${index + 1}번 솔루션 보기`}
                    aria-current={index === activeIndex ? 'true' : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="solution-results-chat" aria-label="솔루션 질문">
          <div className="solution-results-chat-copy">
            <span>NEED A HAND?</span>
            <p>
              궁금한 점이 있다면
              <br />
              AI에게 물어보세요.
            </p>
            <Link to="/solution/chat" aria-label="AI에게 질문하기">
              질문하기 <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="solution-results-chat-art" aria-hidden="true">
            <img src="/assets/solution/help-barista.png" alt="" />
          </div>
        </section>
        {helperText && (
          <section className="solution-results-note">
            <h2>솔루션 안내</h2>
            <p>{helperText}</p>
          </section>
        )}
      </div>
    </AppShell>
  )
}

export function SolutionPreviewPage() {
  const showDrinkExample =
    new URLSearchParams(window.location.search).get('example') === 'drink'

  return (
    <SolutionResults
      storeName="광명 더콤마라운지"
      targetDate="2026-10-13"
      bundleId={1}
      cards={[
        {
          id: 1,
          rankNo: 1,
          title: showDrinkExample
            ? '음료 메뉴 구성을 다시 살펴보세요'
            : '메뉴를 카테고리별로 분류하세요',
          summaryText: showDrinkExample
            ? '잘 팔리는 음료와 새로운 음료를 함께 비교해 보세요.'
            : '메뉴별 매출을 비교할 수 있도록 먼저 분류해 보세요.',
          detailText: '',
          evidence: '',
          isSaved: false,
          savedId: null,
        },
        {
          id: 2,
          rankNo: 2,
          title: '오늘은 추가 매출 확보에 집중하세요',
          summaryText: '영업 종료 전까지 예상 매출과의 차이를 줄여보세요.',
          detailText: '',
          evidence: '',
          isSaved: false,
          savedId: null,
        },
        {
          id: 3,
          rankNo: 3,
          title: '오픈 직후 매출 공백을 줄이세요',
          summaryText: '9시 오픈 직후 방문을 늘릴 방법을 확인해 보세요.',
          detailText: '',
          evidence: '',
          isSaved: false,
          savedId: null,
        },
      ]}
      helperText={null}
    />
  )
}
