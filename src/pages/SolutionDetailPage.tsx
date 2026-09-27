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
  const bundleId = Number(params.solutionId)
  const navigate = useNavigate()

  const [items, setItems] = useState<SolutionCard[]>([])
  const [expirationNotice, setExpirationNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [savingCardId, setSavingCardId] = useState<number | null>(null)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!Number.isFinite(bundleId)) {
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
        setItems(response.data.solutionBundle.items)
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
  }, [bundleId, navigate])

  const handleSave = async (cardId: number) => {
    if (savingCardId !== null) return
    const target = items.find((item) => item.id === cardId)
    if (!target || target.isSaved) return
    setSavingCardId(cardId)
    setSaveError('')
    try {
      const response = await saveSolutionCard(cardId)
      setItems((current) =>
        current.map((item) =>
          item.id === cardId
            ? {
                ...item,
                isSaved: true,
                savedId: response.data.savedSolution.id,
              }
            : item,
        ),
      )
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        navigate('/login')
        return
      }
      setSaveError('솔루션 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSavingCardId(null)
    }
  }

  if (isLoading) {
    return (
      <AppShell title="솔루션 상세">
        <p>불러오는 중...</p>
      </AppShell>
    )
  }

  if (notFound || items.length === 0) {
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
    <AppShell title="솔루션 상세">
      <div className="detail-page">
        <Link to="/solution">← 솔루션 요약</Link>
        <p>오늘의 실행 가이드</p>
        <h1>오늘의 솔루션</h1>
        {expirationNotice && <p>{expirationNotice}</p>}
        {saveError && (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        )}
        <section>
          {items.map((item) => (
            <article key={item.id}>
              <small>0{item.rankNo}</small>
              <b>{item.rankNo === 1 ? '우선 실행' : '함께 확인'}</b>
              <h2>{item.title}</h2>
              <p>{item.summaryText}</p>
              <p>{item.detailText}</p>
              {item.evidence && <p>{item.evidence}</p>}
              <div className="detail-page-actions">
                <button
                  type="button"
                  className="light-button"
                  onClick={() => handleSave(item.id)}
                  disabled={savingCardId === item.id || item.isSaved}
                >
                  {item.isSaved
                    ? '저장됨'
                    : savingCardId === item.id
                      ? '저장 중...'
                      : '이 솔루션 저장하기'}
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  )
}
