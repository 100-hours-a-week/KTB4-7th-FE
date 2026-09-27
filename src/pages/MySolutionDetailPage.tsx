import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  deleteSavedSolutions,
  getSavedSolutionDetail,
  type SavedSolutionDetail,
} from '../features/solution/api/savedSolutionApi'
import { AppShell } from '../shared/ui/AppShell'

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

export function MySolutionDetailPage() {
  const params = useParams()
  const savedId = Number(params.savedId)
  const navigate = useNavigate()
  const [solution, setSolution] = useState<SavedSolutionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let ignore = false
    setIsLoading(true)
    setNotFound(false)
    getSavedSolutionDetail(savedId)
      .then((response) => {
        if (ignore) return
        setSolution(response.data.savedSolution)
      })
      .catch((requestError) => {
        if (ignore) return
        if (isUnauthorized(requestError)) {
          navigate('/login')
          return
        }
        setNotFound(true)
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [savedId, navigate])

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteSavedSolutions([savedId])
      navigate('/my-solutions')
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        navigate('/login')
        return
      }
      setDeleteError(
        '솔루션 저장을 취소하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <AppShell title="내 솔루션">
        <p>불러오는 중...</p>
      </AppShell>
    )
  }

  if (notFound || !solution) {
    return (
      <AppShell title="내 솔루션">
        <div className="detail-page">
          <Link to="/my-solutions">← 내 솔루션</Link>
          <p>저장한 솔루션을 찾을 수 없습니다.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="내 솔루션">
      <div className="detail-page">
        <Link to="/my-solutions">← 내 솔루션</Link>
        <p>{solution.savedDate}에 저장함</p>
        <h1>{solution.displayTitle}</h1>
        {deleteError && (
          <p className="form-error" role="alert">
            {deleteError}
          </p>
        )}
        <section>
          {solution.items.map((item) => (
            <article key={item.rankNo}>
              <small>0{item.rankNo}</small>
              <b>{item.rankNo === 1 ? '우선 실행' : '함께 확인'}</b>
              <h2>{item.title}</h2>
              <p>{item.summaryText}</p>
              <p>{item.detailText}</p>
              {item.evidence && <p>{item.evidence}</p>}
            </article>
          ))}
        </section>
        <div className="detail-page-actions">
          <button
            type="button"
            className="light-button"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? '취소 중...' : '저장 취소'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
