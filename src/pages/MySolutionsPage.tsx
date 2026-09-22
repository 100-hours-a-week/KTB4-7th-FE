import { Link } from 'react-router-dom'
import { dashboardFixtures } from '../entities/dashboard/model/fixtures'
import { getSolutionById } from '../entities/solution/model/fixtures'
import { EmptyState } from '../shared/ui/EmptyState'
import { AppShell } from '../shared/ui/AppShell'
import { useUiStore } from '../shared/store/useUiStore'

export function MySolutionsPage() {
  const savedSolutionIds = useUiStore((state) => state.savedSolutionIds)

  const defaultSaved = dashboardFixtures.savedSolutions
  const extraSaved = savedSolutionIds
    .filter((id) => !defaultSaved.some((solution) => solution.id === id))
    .map((id) => getSolutionById(id))
    .filter((solution): solution is NonNullable<typeof solution> =>
      Boolean(solution),
    )
    .map((solution) => ({
      id: solution.id,
      title: solution.title,
      summary: solution.summary,
    }))

  const savedSolutions = [...defaultSaved, ...extraSaved]

  return (
    <AppShell title="내 솔루션">
      {savedSolutions.length === 0 ? (
        <EmptyState
          title="저장한 솔루션이 없습니다"
          description="필요한 솔루션을 저장하면 이곳에서 다시 볼 수 있습니다."
          action={<Link to="/solution">오늘의 솔루션 보기</Link>}
        />
      ) : (
        <div className="page-stack">
          <header className="page-title">
            <p>SAVED SOLUTIONS</p>
            <h1>다시 보고 싶은 일</h1>
            <span>필요한 순간에 바로 실행할 수 있도록 저장했어요.</span>
          </header>
          <div className="saved-solution-list">
            {savedSolutions.map((solution) => (
              <Link key={solution.id} to={`/solution/${solution.id}`}>
                <small>저장한 솔루션</small>
                <strong>{solution.title}</strong>
                <span>{solution.summary}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  )
}
