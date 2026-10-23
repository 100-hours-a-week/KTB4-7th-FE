import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getGrowthRanking,
  type GrowthRankingEligibilityReason,
  type GrowthRankingResponse,
} from '../features/ranking/api/rankingApi'
import { AppShell } from '../shared/ui/AppShell'

function monthLabel(date: string) {
  const [year, month] = date.split('-')
  return `${year}년 ${Number(month)}월`
}

function growthLabel(rate: number) {
  return `${rate > 0 ? '+' : ''}${rate.toFixed(1)}%`
}

function myRankingGuidance(reason: GrowthRankingEligibilityReason) {
  switch (reason) {
    case 'SELECTED_PERIOD_MISSING':
      return {
        message: '지난달 매출 데이터가 없어 내 순위를 계산하지 못했어요.',
        showUpload: true,
      }
    case 'COMPARISON_PERIOD_MISSING':
      return {
        message: '지지난달 매출 데이터가 있어야 성장률을 비교할 수 있어요.',
        showUpload: true,
      }
    case 'DATA_INCOMPLETE':
      return {
        message: '매출 데이터가 일부 누락되어 내 순위를 계산하지 못했어요.',
        showUpload: true,
      }
    case 'COMPARISON_SALES_ZERO':
      return {
        message:
          '비교 기준인 지지난달 매출이 0원이라 성장률을 계산할 수 없어요.',
        showUpload: false,
      }
    case 'ANALYSIS_NOT_COMPLETED':
      return {
        message: '매출 분석이 완료되면 내 성장 순위를 확인할 수 있어요.',
        showUpload: false,
      }
    default:
      return {
        message: '내 매출 데이터를 확인한 뒤 성장 순위를 계산할 수 있어요.',
        showUpload: false,
      }
  }
}

export function GrowthRankingPage() {
  const [response, setResponse] = useState<GrowthRankingResponse | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getGrowthRanking()
      .then((result) => {
        if (!cancelled) {
          setResponse(result)
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [retryKey])

  function retry() {
    setLoading(true)
    setError(false)
    setRetryKey((key) => key + 1)
  }

  const data = response?.data
  const hasRanking = response?.status === 'COMPLETED' && !!data
  const period = data?.period
  const rankingGuidance = data?.myRanking
    ? null
    : myRankingGuidance(data?.myEligibility.reason ?? null)
  const comparisonMonth = period
    ? Number(period.comparisonStartDate.slice(5, 7))
    : null

  return (
    <AppShell
      title="성장 랭킹"
      backTo="/sales/analysis"
      contentClassName="growth-ranking-content"
    >
      <div className="growth-ranking-page">
        <header className="growth-ranking-heading">
          <h1>성장 랭킹</h1>
          {period && (
            <p>
              <strong>{monthLabel(period.startDate)} 매출</strong> ·{' '}
              {comparisonMonth}월 대비 성장률
            </p>
          )}
        </header>

        {loading ? (
          <p role="status">성장 랭킹을 불러오는 중...</p>
        ) : error ? (
          <div className="growth-ranking-feedback" role="alert">
            <strong>성장 랭킹을 불러오지 못했어요</strong>
            <button type="button" onClick={retry}>
              다시 시도
            </button>
          </div>
        ) : !hasRanking ? (
          <div className="growth-ranking-feedback growth-ranking-feedback--empty">
            <strong>
              {response?.status === 'FAILED'
                ? '성장 랭킹 집계에 실패했어요'
                : response?.status === 'PROCESSING'
                  ? '성장 랭킹을 집계하고 있어요'
                  : '아직 성장 랭킹이 집계되지 않았어요'}
            </strong>
            <p>
              {response?.status === 'FAILED'
                ? '잠시 후 다시 확인해 주세요.'
                : '집계가 완료되면 다른 사장님들의 성장 순위를 확인할 수 있어요.'}
            </p>
            {response?.status === 'FAILED' && (
              <button type="button" onClick={retry}>
                다시 시도
              </button>
            )}
          </div>
        ) : (
          <>
            {data.myRanking ? (
              <section
                className="growth-ranking-my-card"
                aria-label="내 성장 랭킹"
              >
                <small>내 성장 랭킹</small>
                <div>
                  <strong>{data.myRanking.rank}위</strong>
                  <b
                    className={
                      data.myRanking.growthRate < 0 ? 'negative' : 'positive'
                    }
                  >
                    {growthLabel(data.myRanking.growthRate)}
                  </b>
                </div>
                <p>지난달 매출을 지지난달과 비교한 결과예요.</p>
              </section>
            ) : (
              <section
                className="growth-ranking-my-card"
                aria-label="내 성장 랭킹"
              >
                <small>내 성장 랭킹</small>
                <strong>아직 내 순위 정보가 없어요</strong>
                <p>{rankingGuidance?.message}</p>
                {rankingGuidance?.showUpload && (
                  <Link to="/sales/upload">매출 데이터 등록하기</Link>
                )}
              </section>
            )}

            {data.rankings.length > 0 ? (
              <section className="growth-ranking-list-section">
                <div className="growth-ranking-list-heading">
                  <h2>전체 사장님 순위</h2>
                  <small>상호명 비공개 · 상위 20위</small>
                </div>
                <ol
                  className="growth-ranking-list"
                  aria-label="전체 사장님 순위"
                >
                  {data.rankings.map((item) => (
                    <li
                      key={item.rank}
                      className={item.isMine ? 'mine' : undefined}
                    >
                      <span>{String(item.rank).padStart(2, '0')}</span>
                      <strong>
                        {item.isMine ? '내 매장' : item.displayName}
                      </strong>
                      <b
                        className={
                          item.growthRate < 0 ? 'negative' : 'positive'
                        }
                      >
                        {growthLabel(item.growthRate)}
                      </b>
                    </li>
                  ))}
                </ol>
              </section>
            ) : (
              <p className="growth-ranking-list-empty">
                표시할 사장님 순위가 아직 없어요.
              </p>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
