import { useEffect, useState } from 'react'
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

function withoutLeadingDate(title: string) {
  return title.replace(
    /^\s*(?:\d{1,2}[./]\d{1,2}\.?|\d{4}-\d{1,2}-\d{1,2})\s+/,
    '',
  )
}

export function MySolutionsPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<SavedSolutionYearGroup[]>([])
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

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
  const savedSolutions = allSavedCards
    .filter(
      (item) =>
        selectedMonth === null ||
        Number(item.savedDate.slice(5, 7)) === selectedMonth,
    )
    .sort((left, right) => right.savedDate.localeCompare(left.savedDate))

  return (
    <AppShell title="내 솔루션" contentClassName="saved-solutions-content">
      <div className="page-stack my-solutions-page">
        <section className="saved-solutions-intro">
          <h1>저장된 솔루션</h1>
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
                onClick={() => setSelectedMonth(null)}
              >
                전체
              </button>
              {availableMonths.map((month) => (
                <button
                  key={month}
                  type="button"
                  className={selectedMonth === month ? 'active' : undefined}
                  aria-pressed={selectedMonth === month}
                  onClick={() => setSelectedMonth(month)}
                >
                  {month}월
                </button>
              ))}
            </div>
            <section
              className="saved-solution-list"
              aria-label="저장한 솔루션 목록"
            >
              {savedSolutions.length === 0 ? (
                <p className="saved-solution-list-empty">
                  선택한 월에 저장한 솔루션이 없습니다.
                </p>
              ) : (
                savedSolutions.map((item) => {
                  const [, month, day] = item.savedDate.split('-')
                  return (
                    <Link
                      key={item.savedId}
                      className="saved-solution-list-item"
                      to={`/my-solutions/${item.savedId}`}
                    >
                      <time dateTime={item.savedDate}>
                        {month}/{day}
                      </time>
                      <span>
                        <strong>{withoutLeadingDate(item.displayTitle)}</strong>
                        <small>
                          {item.remainingItemCount > 0
                            ? `함께 저장한 ${item.remainingItemCount}개 항목`
                            : '저장한 솔루션'}
                        </small>
                      </span>
                      <span
                        className="saved-solution-list-arrow"
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </Link>
                  )
                })
              )}
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
