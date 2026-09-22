import { Link } from 'react-router-dom'
import { solutionFixtures } from '../entities/solution/model/fixtures'
import { AppShell } from '../shared/ui/AppShell'
export function SolutionPage() {
  const summary = solutionFixtures.available
  const primary = summary.solutions[0]
  return (
    <AppShell title="솔루션">
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
    </AppShell>
  )
}
