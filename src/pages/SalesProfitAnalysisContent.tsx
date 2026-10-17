import { useEffect, useState, type PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getProfitAnalysis,
  type ProfitAnalysisData,
  type ProfitAnalysisResponse,
} from '../features/sales/api/salesApi'
import './sales-profit-analysis.css'

const weekdays: Record<string, string> = {
  MONDAY: '월',
  TUESDAY: '화',
  WEDNESDAY: '수',
  THURSDAY: '목',
  FRIDAY: '금',
  SATURDAY: '토',
  SUNDAY: '일',
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

function changeTone(value: number | null) {
  if (value === null || value === 0) return ''
  return value < 0 ? 'negative' : 'positive'
}

function DailyProfitChart({
  days,
}: {
  days: ProfitAnalysisData['dailyProfits']
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    setActiveIndex(null)
  }, [days])

  if (days.length === 0) return <p>표시할 일별 순이익이 없습니다.</p>
  const values = days.map((day) => day.netProfit)
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  const span = high - low || 1
  const coordinates = days.map((day, index) => {
    const x = days.length === 1 ? 50 : (index / (days.length - 1)) * 100
    const y = 90 - ((day.netProfit - low) / span) * 80
    return { x, y }
  })
  const points = coordinates.map(({ x, y }) => `${x},${y}`).join(' ')
  const zeroY = 90 - ((0 - low) / span) * 80
  const active = activeIndex === null ? null : days[activeIndex]
  const activePoint = activeIndex === null ? null : coordinates[activeIndex]

  const selectAtPointer = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width === 0) return
    const position = (event.clientX - bounds.left) / bounds.width
    setActiveIndex(
      Math.max(
        0,
        Math.min(days.length - 1, Math.round(position * (days.length - 1))),
      ),
    )
  }

  return (
    <div className="profit-daily-chart">
      <div className="profit-daily-plot">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="group"
          tabIndex={0}
          aria-label="일별 순이익 추이 그래프. 마우스나 손가락으로 날짜를 선택하거나 좌우 화살표 키를 누르세요."
          onPointerMove={selectAtPointer}
          onPointerDown={selectAtPointer}
          onPointerLeave={(event) => {
            if (event.pointerType !== 'touch') setActiveIndex(null)
          }}
          onFocus={() => setActiveIndex((index) => index ?? 0)}
          onBlur={() => setActiveIndex(null)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            setActiveIndex((index) =>
              Math.max(
                0,
                Math.min(
                  days.length - 1,
                  (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1),
                ),
              ),
            )
          }}
        >
          <line
            x1="0"
            x2="100"
            y1={zeroY}
            y2={zeroY}
            className="profit-zero-line"
          />
          {activePoint && (
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1="8"
              y2="90"
              className="profit-hover-line"
            />
          )}
          <polyline points={points} fill="none" className="profit-line" />
          {days.map((day, index) => (
            <circle
              key={day.date}
              className="profit-dot"
              r="1.2"
              cx={coordinates[index].x}
              cy={coordinates[index].y}
            />
          ))}
        </svg>
        {active && activePoint && (
          <div
            className={`profit-chart-tooltip${activePoint.y < 35 ? ' below' : ''}`}
            role="status"
            style={{
              left: `clamp(78px, ${activePoint.x}%, calc(100% - 78px))`,
              top: `${activePoint.y}%`,
            }}
          >
            <span>{active.date}</span>
            <strong>{currency(active.netProfit)}</strong>
          </div>
        )}
      </div>
      <div className="profit-chart-range">
        <span>{days[0].date}</span>
        <span>{days[days.length - 1].date}</span>
      </div>
      <p className="profit-chart-hint">
        그래프를 터치하거나 마우스를 올리면 날짜별 금액이 표시됩니다.
      </p>
    </div>
  )
}

function WeekdayProfitChart({
  days,
}: {
  days: ProfitAnalysisData['weekdayProfits']
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    setActiveIndex(null)
  }, [days])

  if (days.length === 0) return <p>표시할 요일별 순이익이 없습니다.</p>
  const max = Math.max(1, ...days.map((day) => Math.abs(day.netProfit)))
  const hasPositive = days.some((day) => day.netProfit > 0)
  const hasNegative = days.some((day) => day.netProfit < 0)
  const scale =
    hasPositive && hasNegative
      ? 'mixed'
      : hasNegative
        ? 'negative-only'
        : 'positive-only'
  const active = activeIndex === null ? null : days[activeIndex]

  return (
    <div className="profit-weekday-chart">
      <div className="profit-weekday-chart-header" aria-live="polite">
        {active ? (
          <div
            className="profit-weekday-tooltip"
            role="status"
            style={{
              left: `clamp(78px, ${((activeIndex! + 0.5) / days.length) * 100}%, calc(100% - 78px))`,
            }}
          >
            <span>
              {weekdays[active.dayOfWeek] ?? active.dayOfWeek}요일 순이익
            </span>
            <strong>{currency(active.netProfit)}</strong>
          </div>
        ) : (
          <p>막대를 터치하거나 마우스를 올리면 금액이 표시됩니다.</p>
        )}
      </div>
      <div
        className={`profit-weekday-bars ${scale}`}
        role="group"
        aria-label="요일별 순이익 막대 그래프"
        onPointerLeave={(event) => {
          if (event.pointerType !== 'touch') setActiveIndex(null)
        }}
      >
        {days.map((day, index) => (
          <button
            key={day.dayOfWeek}
            type="button"
            className={`profit-weekday-item${activeIndex === index ? ' active' : ''}`}
            aria-label={`${weekdays[day.dayOfWeek] ?? day.dayOfWeek}요일 순이익 ${currency(day.netProfit)}`}
            aria-pressed={activeIndex === index}
            onPointerEnter={() => setActiveIndex(index)}
            onPointerDown={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
          >
            <span className="profit-weekday-track" aria-hidden="true">
              <span className="profit-weekday-positive">
                {day.netProfit > 0 && (
                  <span
                    className="profit-weekday-bar"
                    style={{ height: `${(day.netProfit / max) * 100}%` }}
                  />
                )}
              </span>
              <span className="profit-weekday-negative">
                {day.netProfit < 0 && (
                  <span
                    className="profit-weekday-bar"
                    style={{
                      height: `${(Math.abs(day.netProfit) / max) * 100}%`,
                    }}
                  />
                )}
              </span>
            </span>
            <strong>{weekdays[day.dayOfWeek] ?? day.dayOfWeek}</strong>
          </button>
        ))}
      </div>
    </div>
  )
}

export function SalesProfitAnalysisContent({
  targetMonth,
  uploadId,
}: {
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
      .then((result) => {
        if (!ignore) setResponse(result)
      })
      .catch((requestError: unknown) => {
        if (ignore) return
        if (
          typeof requestError === 'object' &&
          requestError !== null &&
          'response' in requestError &&
          (requestError as { response?: { status?: number } }).response
            ?.status === 401
        ) {
          navigate('/login')
          return
        }
        setError(true)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [targetMonth, navigate])

  if (loading) return <p role="status">순이익 분석을 불러오는 중...</p>
  if (error || !response)
    return (
      <p role="alert">순이익 분석을 불러오지 못했습니다. 다시 시도해주세요.</p>
    )
  if (response.status === 'COST_INPUT_REQUIRED') {
    return (
      <div className="profit-analysis-notice">
        <h2>순이익 분석 정보가 필요해요</h2>
        <p>
          {response.data.missingCostMonths.join(', ')} 비용을 확인하고
          저장해주세요.
        </p>
        <Link
          className="primary-action"
          to={`/sales/uploads/${uploadId}/cost-items`}
        >
          비용 입력하기
        </Link>
      </div>
    )
  }
  if (response.status === 'EMPTY') {
    return (
      <p className="profit-analysis-notice">
        선택한 달의 매출 데이터가 없습니다.
      </p>
    )
  }

  const { summary, dailyProfits, weekdayProfits, aiInsight } = response.data
  return (
    <div className="profit-analysis-content">
      <p className="profit-analysis-estimate">
        식자재 추정원가·임대료·인건비를 반영한 예상 순이익입니다.
      </p>
      <div className="stat-card-grid">
        <div className="stat-card">
          <small>순이익</small>
          <strong>{currency(summary.netProfit)}</strong>
          <span className={changeTone(summary.netProfitChangeRate)}>
            {change(summary.netProfitChangeRate)}
          </span>
        </div>
        <div className="stat-card">
          <small>총비용</small>
          <strong>{currency(summary.totalCost)}</strong>
          <span className={changeTone(summary.totalCostChangeRate)}>
            {change(summary.totalCostChangeRate)}
          </span>
        </div>
        <div className="stat-card">
          <small>순이익률</small>
          <strong>{rate(summary.netProfitRate)}</strong>
          <span className={changeTone(summary.netProfitRateDifference)}>
            {change(summary.netProfitRateDifference, '%p')}
          </span>
        </div>
      </div>
      <p className="profit-analysis-estimate">
        ⓘ 공과금, 카드·배달 수수료 등은 포함되지 않아요. 실제 순수익과 차이가
        발생할 수 있어요.
      </p>
      <section className="ai-insight-box">
        <h2>순이익 인사이트</h2>
        {aiInsight?.status === 'COMPLETED' && aiInsight.insights.length > 0 ? (
          <ul>
            {aiInsight.insights.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
        ) : (
          <p>표시할 인사이트가 아직 없습니다.</p>
        )}
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
        <p>
          메뉴별·시간대별 순이익은 필요한 원가와 비용 정보가 준비되면 제공할
          예정입니다.
        </p>
      </section>
    </div>
  )
}
