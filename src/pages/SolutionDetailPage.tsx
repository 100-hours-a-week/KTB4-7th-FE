import { Link, useNavigate, useParams } from 'react-router-dom'
import { getSolutionById } from '../entities/solution/model/fixtures'
import { AppShell } from '../shared/ui/AppShell'
import { useUiStore } from '../shared/store/useUiStore'

export function SolutionDetailPage() {
  const solution = getSolutionById(useParams().solutionId ?? '')
  const navigate = useNavigate()
  const saveSolution = useUiStore((state) => state.saveSolution)

  const handleSave = () => {
    if (!solution) return
    saveSolution(solution.id)
    navigate('/my-solutions')
  }

  return (
    <AppShell title="솔루션 상세">
      <div className="detail-page">
        {!solution ? (
          <>
            <h1>솔루션을 찾을 수 없습니다</h1>
            <Link to="/solution">솔루션 요약으로</Link>
          </>
        ) : (
          <>
            <Link to="/solution">← 솔루션 요약</Link>
            <p>오늘의 실행 가이드</p>
            <h1>{solution.title}</h1>
            <p>{solution.summary}</p>
            <section>
              {solution.actions.map((action, index) => (
                <article key={action.id}>
                  <small>0{index + 1}</small>
                  <b>
                    {action.priority === 'high' ? '우선 실행' : '함께 확인'}
                  </b>
                  <h2>{action.title}</h2>
                  <p>{action.detail}</p>
                </article>
              ))}
            </section>
            <div className="detail-page-actions">
              <Link
                className="dark-button"
                to={`/solution/${solution.id}/chat`}
              >
                AI에게 질문하기
              </Link>
              <button
                type="button"
                className="light-button"
                onClick={handleSave}
              >
                솔루션 저장하기
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
