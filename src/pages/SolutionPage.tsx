import { Link } from 'react-router-dom'
import {
  solutionFixtures,
  type Solution,
} from '../entities/solution/model/fixtures'
import { EmptyState } from '../shared/ui/EmptyState'
import { AppShell } from '../shared/ui/AppShell'
type SolutionSummary = {
  availability: 'available' | 'unavailable'
  storeName: string
  generatedAt?: string
  solutions: Solution[]
}
export function SolutionPage({
  summary = solutionFixtures.available,
}: {
  summary?: SolutionSummary
}) {
  const primary = summary.solutions[0]
  return (
    <AppShell title="솔루션">
      {!primary ? (
        <EmptyState
          title="아직 제공된 솔루션이 없습니다"
          description="매출 데이터를 업로드하면 매장에 맞는 다음 행동을 제안해 드릴게요."
          action={<Link to="/sales/upload">매출 데이터 업로드</Link>}
        />
      ) : (
        <div className="solution-page">
          <section className="solution-lead">
            <p>오늘의 우선순위</p>
            <h1>
              {summary.storeName}에<br />
              먼저 필요한 일
            </h1>
            <small>분석 기준 {summary.generatedAt}</small>
          </section>
          <article className="solution-card">
            <span>우선 실행</span>
            <h2>{primary.title}</h2>
            <p>{primary.summary}</p>
            <Link className="dark-button" to={`/solution/${primary.id}`}>
              솔루션 상세 보기
            </Link>
          </article>
          <div className="solution-list">
            {summary.solutions.slice(1).map((solution, index) => (
              <Link key={solution.id} to={`/solution/${solution.id}`}>
                0{index + 2}
                <strong>{solution.title}</strong>
                <small>{solution.summary}</small>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  )
}
