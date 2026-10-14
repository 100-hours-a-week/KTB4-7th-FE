import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getSolutionBundleDetail,
  saveSolutionCard,
  type SolutionCard,
} from '../features/solution/api/solutionApi'
import { AppShell } from '../shared/ui/AppShell'

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

export function SolutionDetailPage() {
  const params = useParams()
  const bundleId = Number(params.bundleId)
  const cardId = Number(params.cardId)
  const navigate = useNavigate()

  const [item, setItem] = useState<SolutionCard | null>(null)
  const [expirationNotice, setExpirationNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!Number.isFinite(bundleId) || !Number.isFinite(cardId)) {
      setIsLoading(false)
      setNotFound(true)
      return
    }
    let ignore = false
    setIsLoading(true)
    setNotFound(false)
    getSolutionBundleDetail(bundleId)
      .then((response) => {
        if (ignore) return
        const found = response.data.solutionBundle.items.find(
          (candidate) => candidate.id === cardId,
        )
        if (!found) {
          setNotFound(true)
          return
        }
        setItem(found)
        setExpirationNotice(response.data.solutionBundle.expirationNotice)
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
  }, [bundleId, cardId, navigate])

  const handleSave = async () => {
    if (!item || isSaving || item.isSaved) return
    setIsSaving(true)
    setSaveError('')
    try {
      const response = await saveSolutionCard(item.id)
      setItem((current) =>
        current
          ? {
              ...current,
              isSaved: true,
              savedId: response.data.savedSolution.id,
            }
          : current,
      )
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        navigate('/login')
        return
      }
      setSaveError('솔루션 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AppShell title="솔루션 상세">
        <p>불러오는 중...</p>
      </AppShell>
    )
  }

  if (notFound || !item) {
    return (
      <AppShell title="솔루션 상세">
        <div className="detail-page">
          <h1>솔루션을 찾을 수 없습니다</h1>
          <Link to="/solution">← 솔루션 요약</Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="솔루션 상세" backTo="/solution">
      <div className="solution-result-detail">
        <Link className="solution-result-detail-back" to="/solution">
          <span aria-hidden="true">←</span> 오늘의 제안으로
        </Link>
        <header className="solution-result-detail-hero">
          <div className="solution-result-detail-meta">
            <span>ACTION {String(item.rankNo).padStart(2, '0')}</span>
            <span>{item.rankNo === 1 ? '우선 실행' : '함께 확인'}</span>
          </div>
          <h1>{item.title}</h1>
          <p>{item.summaryText}</p>
        </header>

        <div className="solution-result-detail-content">
          <section
            className="solution-result-detail-section"
            aria-labelledby="solution-action-title"
          >
            <span className="solution-result-detail-index">01 / ACTION</span>
            <h2 id="solution-action-title">이렇게 실행해 보세요</h2>
            <p className="solution-result-detail-text">{item.detailText}</p>
          </section>

          {expirationNotice && (
            <p className="solution-result-detail-notice">{expirationNotice}</p>
          )}
          {saveError && (
            <p className="form-error" role="alert">
              {saveError}
            </p>
          )}
          <button
            type="button"
            className="solution-result-detail-save"
            onClick={handleSave}
            disabled={isSaving || item.isSaved}
          >
            {item.isSaved
              ? '저장됨'
              : isSaving
                ? '저장 중...'
                : '이 솔루션 저장하기'}
            <span aria-hidden="true">{item.isSaved ? '✓' : '↗'}</span>
          </button>
        </div>
      </div>
    </AppShell>
  )
}
