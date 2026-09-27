import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getSalesAnalysis,
  getSalesAvailableMonths,
  type SalesAnalysisData,
  type SalesDailyPoint,
} from '../features/sales/api/salesApi'
import { EmptyState } from '../shared/ui/EmptyState'
import { AppShell } from '../shared/ui/AppShell'

const weekdayLabels: Record<string, string> = {
  MONDAY: '월',
  TUESDAY: '화',
  WEDNESDAY: '수',
  THURSDAY: '목',
  FRIDAY: '금',
  SATURDAY: '토',
  SUNDAY: '일',
}

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

function formatCurrency(amount: number) {
  return `₩${Math.round(amount).toLocaleString()}`
}

function formatChange(rate: number | null) {
  if (rate === null || rate === undefined) return null
  const sign = rate > 0 ? '+' : rate < 0 ? '' : '+'
  return `${sign}${rate.toFixed(1)}%`
}

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}.${day}`
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-')
  return `${year}년 ${Number(monthNumber)}월`
}

function monthRange(month: string) {
  const [yearText, monthText] = month.split('-')
  const year = Number(yearText)
  const monthIndex = Number(monthText) - 1
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return {
    startDate: `${yearText}-${monthText}-01`,
    endDate: `${yearText}-${monthText}-${String(lastDay).padStart(2, '0')}`,
  }
}

function TrendBadge({ change }: { change: string | null }) {
  if (!change) return <span className="trend-badge trend-neutral">-</span>
  const isPositive = change.trim().startsWith('+')
  return (
    <span
      className={isPositive ? 'trend-badge trend-up' : 'trend-badge trend-down'}
    >
      {isPositive ? '▲' : '▼'} {change.replace(/^[+-]/, '')}
    </span>
  )
}

function DailyTrendChart({ data }: { data: SalesDailyPoint[] }) {
  if (data.length === 0) {
    return <p className="chart-empty">표시할 일별 매출 데이터가 없습니다.</p>
  }

  const maxAmount = Math.max(1, ...data.map((item) => item.salesAmount))
  const coords = data.map((item, index) => ({
    x: data.length > 1 ? (index / (data.length - 1)) * 300 : 150,
    y: 96 - (item.salesAmount / maxAmount) * 84,
    item,
  }))
  const linePath = coords
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`,
    )
    .join(' ')
  const lastPoint = coords[coords.length - 1]
  const firstPoint = coords[0]
  const areaPath = `${linePath} L${lastPoint.x.toFixed(1)},100 L${firstPoint.x.toFixed(1)},100 Z`

  return (
    <div className="daily-trend-chart">
      <svg
        viewBox="0 0 300 100"
        preserveAspectRatio="none"
        aria-label="일별 매출 추이"
        role="img"
      >
        <path d={areaPath} className="daily-trend-area" />
        <path d={linePath} className="daily-trend-line" fill="none" />
        {coords.map((point) => (
          <circle
            key={point.item.date}
            cx={point.x}
            cy={point.y}
            r={2.4}
            className="daily-trend-dot"
          />
        ))}
      </svg>
      <div className="daily-trend-range">
        <span>{formatShortDate(data[0].date)}</span>
        <span>{formatShortDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  )
}

export function SalesAnalysisPage() {
  const navigate = useNavigate()
  const [availableMonths, setAvailableMonths] = useState<string[] | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [status, setStatus] = useState<'COMPLETED' | 'EMPTY' | null>(null)
  const [data, setData] = useState<SalesAnalysisData | null>(null)
  const [isLoadingMonths, setIsLoadingMonths] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    getSalesAvailableMonths()
      .then((response) => {
        if (ignore) return
        setAvailableMonths(response.months)
        setSelectedMonth(response.months[response.months.length - 1] ?? null)
      })
      .catch((requestError) => {
        if (ignore) return
        if (isUnauthorized(requestError)) {
          navigate('/login')
          return
        }
        setError('매출 분석을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!ignore) setIsLoadingMonths(false)
      })
    return () => {
      ignore = true
    }
  }, [navigate])

  useEffect(() => {
    if (!selectedMonth) return
    let ignore = false
    const { startDate, endDate } = monthRange(selectedMonth)
    setIsLoading(true)
    setError('')
    getSalesAnalysis({ periodType: 'CUSTOM', startDate, endDate })
      .then((response) => {
        if (ignore) return
        setStatus(response.status)
        setData(response.data)
      })
      .catch((requestError) => {
        if (ignore) return
        if (isUnauthorized(requestError)) {
          navigate('/login')
          return
        }
        setError('매출 분석을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [navigate, selectedMonth])

  if (!isLoadingMonths && (!availableMonths || availableMonths.length === 0)) {
    return (
      <AppShell title="매출 분석">
        <EmptyState
          title="분석할 매출 데이터가 없습니다"
          description="매출 파일을 업로드하면 매장의 흐름을 한눈에 확인할 수 있어요."
          action={<Link to="/sales/upload">매출 데이터 업로드</Link>}
        />
      </AppShell>
    )
  }

  if (!isLoadingMonths && !isLoading && (status === 'EMPTY' || error)) {
    return (
      <AppShell title="매출 분석">
        <EmptyState
          title={
            error
              ? '매출 분석을 불러오지 못했습니다'
              : '분석할 매출 데이터가 없습니다'
          }
          description={
            error
              ? '잠시 후 다시 시도해 주세요.'
              : '매출 파일을 업로드하면 매장의 흐름을 한눈에 확인할 수 있어요.'
          }
          action={<Link to="/sales/upload">매출 데이터 업로드</Link>}
        />
      </AppShell>
    )
  }

  const weekdayMax = data
    ? Math.max(1, ...data.weekdaySales.map((item) => item.salesAmount))
    : 1
  const hourlyMax = data
    ? Math.max(1, ...data.hourlySales.map((item) => item.salesAmount))
    : 1
  const menuMax = data
    ? Math.max(1, ...data.menuRankings.map((item) => item.salesAmount))
    : 1

  return (
    <AppShell title="매출 분석">
      <div className="page-stack sales-analysis-page">
        <header className="page-title analysis-page-title">
          <div>
            <p>SALES ANALYSIS</p>
            <h1>매출 분석</h1>
            <span>월을 선택해서 매출 흐름을 한눈에 확인해보세요</span>
          </div>
          {availableMonths && availableMonths.length > 0 && (
            <select
              className="month-select"
              aria-label="조회할 월"
              value={selectedMonth ?? ''}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {[...availableMonths].reverse().map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          )}
        </header>

        {isLoadingMonths || isLoading || !data ? (
          <p>불러오는 중...</p>
        ) : (
          <>
            <div className="stat-card-grid">
              <div className="stat-card">
                <small>총 매출</small>
                <strong>{formatCurrency(data.kpis.totalSales)}</strong>
                <TrendBadge
                  change={formatChange(data.kpis.changes.totalSalesRate)}
                />
                <span className="stat-card-caption">이전 기간 대비</span>
              </div>
              <div className="stat-card">
                <small>주문 건수</small>
                <strong>{data.kpis.orderCount.toLocaleString()}건</strong>
                <TrendBadge
                  change={formatChange(data.kpis.changes.orderCountRate)}
                />
                <span className="stat-card-caption">이전 기간 대비</span>
              </div>
              <div className="stat-card">
                <small>평균 객단가</small>
                <strong>{formatCurrency(data.kpis.averageOrderValue)}</strong>
                <TrendBadge
                  change={formatChange(data.kpis.changes.averageOrderValueRate)}
                />
                <span className="stat-card-caption">이전 기간 대비</span>
              </div>
            </div>

            {data.aiInsight && data.aiInsight.insights.length > 0 && (
              <div className="ai-insight-box">
                <h2>AI가 발견했어요</h2>
                <ul>
                  {data.aiInsight.insights.map((insight) => (
                    <li key={insight}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            <section className="analysis-chart-section">
              <h2>분석 그래프</h2>

              <div className="section-card chart-card">
                <h3>시간대별 매출</h3>
                {data.hourlySales.length === 0 ? (
                  <p className="chart-empty">
                    표시할 시간대별 매출 데이터가 없습니다.
                  </p>
                ) : (
                  <>
                    <div className="sales-chart" aria-label="시간대별 매출">
                      {data.hourlySales.map((item) => (
                        <span
                          key={item.hour}
                          style={{
                            height: `${Math.max(4, (item.salesAmount / hourlyMax) * 100)}%`,
                          }}
                          aria-label={`${item.hour}시 ${formatCurrency(item.salesAmount)}`}
                        />
                      ))}
                    </div>
                    <div className="sales-chart-labels">
                      {data.hourlySales.map((item) => (
                        <span key={item.hour}>{item.hour}시</span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="section-card chart-card">
                <h3>일별 매출 추이</h3>
                <DailyTrendChart data={data.dailySales} />
              </div>

              <div className="section-card chart-card">
                <h3>요일별 매출</h3>
                <div className="sales-chart" aria-label="요일별 매출">
                  {data.weekdaySales.map((item) => (
                    <span
                      key={item.dayOfWeek}
                      style={{
                        height: `${Math.max(4, (item.salesAmount / weekdayMax) * 100)}%`,
                      }}
                      aria-label={`${weekdayLabels[item.dayOfWeek] ?? item.dayOfWeek} ${formatCurrency(item.salesAmount)}`}
                    />
                  ))}
                </div>
                <div className="sales-chart-labels">
                  {data.weekdaySales.map((item) => (
                    <span key={item.dayOfWeek}>
                      {weekdayLabels[item.dayOfWeek] ?? item.dayOfWeek}
                    </span>
                  ))}
                </div>
              </div>

              <div className="section-card chart-card">
                <h3>메뉴별 매출 순위</h3>
                {data.menuRankings.length === 0 ? (
                  <p className="chart-empty">
                    표시할 메뉴별 매출 데이터가 없습니다.
                  </p>
                ) : (
                  <ol className="menu-ranking-list">
                    {data.menuRankings.map((item) => (
                      <li key={item.rank}>
                        <span className="menu-rank-number">{item.rank}</span>
                        <div className="menu-rank-body">
                          <div className="menu-rank-row">
                            <strong>{item.menuName}</strong>
                            <span>{formatCurrency(item.salesAmount)}</span>
                          </div>
                          <div className="menu-rank-bar">
                            <span
                              style={{
                                width: `${Math.max(4, (item.salesAmount / menuMax) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            <Link className="secondary-action" to="/sales/upload">
              다른 파일 선택
            </Link>
          </>
        )}
      </div>
    </AppShell>
  )
}
