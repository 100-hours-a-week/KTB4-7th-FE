import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getSavedSolutions,
  type SavedSolutionYearGroup,
} from '../features/solution/api/savedSolutionApi'
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

function mergeGroups(
  previous: SavedSolutionYearGroup[],
  next: SavedSolutionYearGroup[],
): SavedSolutionYearGroup[] {
  const merged = new Map<number, SavedSolutionYearGroup>()
  for (const group of previous) {
    merged.set(group.year, { year: group.year, items: [...group.items] })
  }
  for (const group of next) {
    const existing = merged.get(group.year)
    if (existing) {
      existing.items = [...existing.items, ...group.items]
    } else {
      merged.set(group.year, { year: group.year, items: [...group.items] })
    }
  }
  return [...merged.values()]
}

export function MySolutionsPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<SavedSolutionYearGroup[]>([])
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    let ignore = false
    getSavedSolutions({ size: 20 })
      .then((response) => {
        if (ignore) return
        setGroups(response.data.groups)
        setNextCursor(response.nextCursor)
      })
      .catch((requestError) => {
        if (ignore) return
        if (isUnauthorized(requestError)) {
          navigate('/login')
          return
        }
        setError('저장한 솔루션을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [navigate])

  const handleLoadMore = async () => {
    if (!nextCursor) return
    setIsLoadingMore(true)
    setError('')
    try {
      const response = await getSavedSolutions({
        size: 20,
        cursor: nextCursor,
      })
      setGroups((previous) => mergeGroups(previous, response.data.groups))
      setNextCursor(response.nextCursor)
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        navigate('/login')
        return
      }
      setError('저장한 솔루션을 더 불러오지 못했습니다.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  const hasItems = groups.some((group) => group.items.length > 0)
  const allSavedCards = groups.flatMap((group) => group.items)
  const availableMonths = [
    ...new Set(allSavedCards.map((item) => Number(item.savedDate.slice(5, 7)))),
  ].sort((left, right) => right - left)
  const savedCards = allSavedCards.filter(
    (item) =>
      selectedMonth === null ||
      Number(item.savedDate.slice(5, 7)) === selectedMonth,
  )

  const selectMonth = (month: number | null) => {
    setSelectedMonth(month)
    setActiveIndex(0)
  }

  const showPrevious = () => {
    setActiveIndex((current) => Math.max(0, current - 1))
  }

  const showNext = () => {
    setActiveIndex((current) => Math.min(savedCards.length - 1, current + 1))
  }

  const handleTouchEnd = (clientY: number) => {
    if (touchStartY.current === null) return
    const distance = clientY - touchStartY.current
    touchStartY.current = null
    if (Math.abs(distance) < 45) return
    if (distance < 0) showNext()
    else showPrevious()
  }

  return (
    <AppShell title="내 솔루션" contentClassName="saved-solutions-content">
      <div className="page-stack my-solutions-page">
        <section className="saved-solutions-intro">
          <span>저장한 솔루션</span>
          <h1>다시 보고 싶은 일</h1>
          <p>필요한 순간에 바로 실행할 수 있도록 저장했어요.</p>
        </section>
        {error && <p role="alert">{error}</p>}
        {isLoading ? (
          <p>불러오는 중...</p>
        ) : !hasItems ? (
          <EmptyState
            title="저장한 솔루션이 없습니다"
            description="필요한 솔루션을 저장하면 이곳에서 다시 볼 수 있습니다."
            action={<Link to="/solution">오늘의 솔루션 보기</Link>}
          />
        ) : (
          <>
            <div
              className="saved-solution-filters"
              role="group"
              aria-label="저장 솔루션 월별 필터"
            >
              <button
                type="button"
                className={selectedMonth === null ? 'active' : undefined}
                aria-pressed={selectedMonth === null}
                onClick={() => selectMonth(null)}
              >
                전체
              </button>
              {availableMonths.map((month) => (
                <button
                  key={month}
                  type="button"
                  className={selectedMonth === month ? 'active' : undefined}
                  aria-pressed={selectedMonth === month}
                  onClick={() => selectMonth(month)}
                >
                  {month}월
                </button>
              ))}
            </div>
            <section
              className="saved-solution-carousel"
              aria-label="저장한 솔루션 카드"
            >
              <div
                className="saved-solution-carousel-viewport"
                onTouchStart={(event) => {
                  touchStartY.current = event.touches[0]?.clientY ?? null
                }}
                onTouchEnd={(event) => {
                  handleTouchEnd(event.changedTouches[0]?.clientY ?? 0)
                }}
              >
                {savedCards.map((item, index) => {
                  const offset = index - activeIndex
                  const isActive = offset === 0
                  const isVisible = Math.abs(offset) <= 2
                  return (
                    <Link
                      key={item.savedId}
                      className="saved-solution-card"
                      data-offset={Math.max(-2, Math.min(2, offset))}
                      data-visible={isVisible}
                      aria-current={isActive ? 'true' : undefined}
                      aria-hidden={!isVisible}
                      tabIndex={isVisible ? 0 : -1}
                      to={`/my-solutions/${item.savedId}`}
                      onClick={(event) => {
                        if (isActive) return
                        event.preventDefault()
                        setActiveIndex(index)
                      }}
                    >
                      <span className="saved-solution-card-index">
                        <span>
                          {isActive ? 'MEMME SOLUTION' : item.displayTitle}
                        </span>
                        <span>CARD {String(index + 1).padStart(2, '0')}</span>
                      </span>
                      <strong>{item.displayTitle}</strong>
                      <span className="saved-solution-card-meta">
                        <span>
                          {item.remainingItemCount > 0
                            ? `${item.remainingItemCount + 1} SOLUTIONS`
                            : '1 SOLUTION'}
                        </span>
                        <span>ARCHIVE</span>
                      </span>
                      <span className="saved-solution-card-open">
                        자세히 보기 <span aria-hidden="true">↗</span>
                      </span>
                    </Link>
                  )
                })}
              </div>

              <div className="saved-solution-carousel-controls">
                <button
                  type="button"
                  aria-label="이전 저장 솔루션"
                  disabled={activeIndex === 0}
                  onClick={showPrevious}
                >
                  ↑
                </button>
                <span aria-live="polite">
                  {String(activeIndex + 1).padStart(2, '0')} /{' '}
                  {String(savedCards.length).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  aria-label="다음 저장 솔루션"
                  disabled={activeIndex === savedCards.length - 1}
                  onClick={showNext}
                >
                  ↓
                </button>
              </div>
              <p className="saved-solution-swipe-hint">SWIPE UP OR DOWN</p>
            </section>
            {nextCursor && (
              <button
                type="button"
                className="notification-list-load-more"
                disabled={isLoadingMore}
                onClick={handleLoadMore}
              >
                {isLoadingMore ? '불러오는 중...' : '더보기'}
              </button>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
