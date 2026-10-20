import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  deleteSavedSolutions,
  getSavedSolutionDetail,
  type SavedSolutionDetail,
} from '../features/solution/api/savedSolutionApi'
import { SolutionActionDetail } from '../features/solution/ui/SolutionActionDetail'
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
      <AppShell title="솔루션 상세" backTo="/my-solutions">
        <p>불러오는 중...</p>
      </AppShell>
    )
  }

  if (notFound || !solution) {
    return (
      <AppShell title="솔루션 상세" backTo="/my-solutions">
        <div className="detail-page">
          <Link to="/my-solutions">← 내 솔루션</Link>
          <p>저장한 솔루션을 찾을 수 없습니다.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="솔루션 상세" backTo="/my-solutions">
      <div className="solution-result-detail my-solution-detail">
        <Link className="solution-result-detail-back" to="/my-solutions">
          <span aria-hidden="true">←</span> 내 솔루션
        </Link>
        <div className="my-solution-detail-saved-meta">
          <time dateTime={solution.savedDate}>{solution.savedDate}</time>
          <span>{solution.displayTitle}</span>
        </div>
        <div className="my-solution-detail-actions">
          {solution.items.map((item, index) => (
            <SolutionActionDetail
              key={item.rankNo}
              item={item}
              titleLevel={index === 0 ? 1 : 2}
            />
          ))}
        </div>
        <div className="my-solution-detail-footer">
          {deleteError && (
            <p className="form-error" role="alert">
              {deleteError}
            </p>
          )}
          <button
            type="button"
            className="my-solution-detail-delete"
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
