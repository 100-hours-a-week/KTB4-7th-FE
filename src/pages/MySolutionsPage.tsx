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

export function MySolutionsPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<SavedSolutionYearGroup[]>([])
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <AppShell title="내 솔루션">
      <div className="page-stack">
        <header className="page-title">
          <p>SAVED SOLUTIONS</p>
          <h1>다시 보고 싶은 일</h1>
          <span>필요한 순간에 바로 실행할 수 있도록 저장했어요.</span>
        </header>
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
            {groups.map(
              (group) =>
                group.items.length > 0 && (
                  <section key={group.year}>
                    <p>{group.year}년</p>
                    <div className="saved-solution-list">
                      {group.items.map((item) => (
                        <Link
                          key={item.savedId}
                          to={`/my-solutions/${item.savedId}`}
                        >
                          <small>저장한 솔루션</small>
                          <strong>{item.displayTitle}</strong>
                          {item.remainingItemCount > 0 && (
                            <span>외 {item.remainingItemCount}개</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </section>
                ),
            )}
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
