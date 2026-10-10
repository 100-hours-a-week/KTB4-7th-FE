import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getProfitAnalysis,
  type ProfitAnalysisData,
  type ProfitAnalysisResponse,
} from '../features/sales/api/salesApi'
import './sales-profit-analysis.css'

const weekdays: Record<string, string> = {
  MONDAY: '월', TUESDAY: '화', WEDNESDAY: '수', THURSDAY: '목',
  FRIDAY: '금', SATURDAY: '토', SUNDAY: '일',
}

function rangeOf(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`,
  }
}

function currency(amount: number) {
  return `${Math.round(amount).toLocaleString()}원`
}

function rate(value: number | null) {
  return value === null ? '-' : `${(value * 100).toFixed(1)}%`
}

function change(value: number | null, suffix = '%') {
  if (value === null) return '이전 달 비교 -'
  const percent = value * 100
  return `이전 달 대비 ${percent > 0 ? '+' : ''}${percent.toFixed(1)}${suffix}`
}

function DailyProfitChart({ days }: { days: ProfitAnalysisData['dailyProfits'] }) {
  if (days.length === 0) return <p>표시할 일별 순이익이 없습니다.</p>
  const values = days.map((day) => day.netProfit)
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  const span = high - low || 1
  const points = days.map((day, index) => {
    const x = days.length === 1 ? 50 : (index / (days.length - 1)) * 100
    const y = 90 - ((day.netProfit - low) / span) * 80
    return `${x},${y}`
  }).join(' ')
  const zeroY = 90 - ((0 - low) / span) * 80

  return (
    <div className="profit-daily-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img"
        aria-label="일별 순이익 추이 선 그래프">
        <line x1="0" x2="100" y1={zeroY} y2={zeroY} className="profit-zero-line" />
        <polyline points={points} fill="none" className="profit-line" />
        {days.map((day, index) => (
          <circle key={day.date} className="profit-dot" r="1.2"
            cx={days.length === 1 ? 50 : (index / (days.length - 1)) * 100}
            cy={90 - ((day.netProfit - low) / span) * 80} />
        ))}
      </svg>
      <div className="profit-chart-range">
        <span>{days[0].date}</span><span>{days[days.length - 1].date}</span>
      </div>
      <details>
        <summary>일별 금액 보기</summary>
        <ul>{days.map((day) => <li key={day.date}>{day.date}: {currency(day.netProfit)}</li>)}</ul>
      </details>
    </div>
  )
}

function WeekdayProfitChart({ days }: { days: ProfitAnalysisData['weekdayProfits'] }) {
  const max = Math.max(1, ...days.map((day) => Math.abs(day.netProfit)))
  return (
    <div className="profit-weekday-chart" role="group" aria-label="요일별 순이익 막대 그래프">
      {days.map((day) => (
        <div key={day.dayOfWeek} className="profit-weekday-item">
          <div className="profit-weekday-track">
            <div className="profit-weekday-positive">
              {day.netProfit > 0 && <div className="profit-weekday-bar"
                style={{ height: `${day.netProfit / max * 100}%` }} />}
            </div>
            <div className="profit-weekday-negative">
              {day.netProfit < 0 && <div className="profit-weekday-bar negative"
                style={{ height: `${Math.abs(day.netProfit) / max * 100}%` }} />}
            </div>
          </div>
          <strong>{weekdays[day.dayOfWeek] ?? day.dayOfWeek}</strong>
          <small>{currency(day.netProfit)}</small>
        </div>
      ))}
    </div>
  )
}

export function SalesProfitAnalysisContent({ targetMonth, uploadId }: {
  targetMonth: string
  uploadId: number
}) {
  const navigate = useNavigate()
  const [response, setResponse] = useState<ProfitAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError(false)
    setResponse(null)
    const { startDate, endDate } = rangeOf(targetMonth)
    getProfitAnalysis(startDate, endDate)
      .then((result) => { if (!ignore) setResponse(result) })
      .catch((requestError: unknown) => {
        if (ignore) return
        if (typeof requestError === 'object' && requestError !== null && 'response' in requestError &&
            (requestError as { response?: { status?: number } }).response?.status === 401) {
          navigate('/login')
          return
        }
        setError(true)
      })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [targetMonth, navigate])

  if (loading) return <p role="status">순이익 분석을 불러오는 중...</p>
  if (error || !response) return <p role="alert">순이익 분석을 불러오지 못했습니다. 다시 시도해주세요.</p>
  if (response.status === 'COST_INPUT_REQUIRED') {
    return (
      <div className="profit-analysis-notice">
        <h2>순이익 분석 정보가 필요해요</h2>
        <p>{response.data.missingCostMonths.join(', ')} 비용을 확인하고 저장해주세요.</p>
        <Link className="primary-action" to={`/sales/uploads/${uploadId}/cost-items`}>비용 입력하기</Link>
      </div>
    )
  }
  if (response.status === 'EMPTY') {
    return <p className="profit-analysis-notice">선택한 달의 매출 데이터가 없습니다.</p>
  }

  const { summary, dailyProfits, weekdayProfits, aiInsight } = response.data
  return (
    <div className="profit-analysis-content">
      <p className="profit-analysis-estimate">식자재 추정원가·임대료·인건비를 반영한 예상 순이익입니다.</p>
      <div className="stat-card-grid">
        <div className="stat-card">
          <small>순이익</small><strong>{currency(summary.netProfit)}</strong>
          <span>{change(summary.netProfitChangeRate)}</span>
        </div>
        <div className="stat-card">
          <small>총비용</small><strong>{currency(summary.totalCost)}</strong>
          <span>{change(summary.totalCostChangeRate)}</span>
        </div>
        <div className="stat-card">
          <small>순이익률</small><strong>{rate(summary.netProfitRate)}</strong>
          <span>{change(summary.netProfitRateDifference, '%p')}</span>
        </div>
      </div>
      <p className="profit-analysis-estimate">ⓘ 공과금, 카드·배달 수수료 등은 포함되지 않아요. 실제 순수익과 차이가 발생할 수 있어요.</p>
      <section className="ai-insight-box">
        <h2>순이익 인사이트</h2>
        {aiInsight?.status === 'COMPLETED' && aiInsight.insights.length > 0 ? (
          <ul>{aiInsight.insights.map((insight) => <li key={insight}>{insight}</li>)}</ul>
        ) : <p>표시할 인사이트가 아직 없습니다.</p>}
      </section>
      <section className="section-card profit-chart-section">
        <h2>일별 순이익 추이</h2>
        <DailyProfitChart days={dailyProfits} />
      </section>
      <section className="section-card profit-chart-section">
        <h2>요일별 순이익</h2>
        <WeekdayProfitChart days={weekdayProfits} />
      </section>
      <section className="section-card profit-chart-section">
        <h2>추가 분석</h2>
        <p>메뉴별·시간대별 순이익은 필요한 원가와 비용 정보가 준비되면 제공할 예정입니다.</p>
      </section>
    </div>
  )
}
