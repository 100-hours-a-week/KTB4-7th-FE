import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  getSalesAnalysis,
  getSalesAvailableMonths,
  getSalesExpectedForecast,
  type SalesAnalysisData,
  type SalesDailyPoint,
  type SalesExpectedForecast,
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

const MENU_PAGE_SIZE = 10
const FORECAST_RETRY_INTERVAL_MS = 3000
const FORECAST_MAX_RETRIES = 20

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

type ChartTip = { x: number; y: number; text: string } | null

function ChartTooltip({ tip }: { tip: ChartTip }) {
  if (!tip) return null
  return (
    <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
      {tip.text}
    </div>
  )
}

function DailyTrendChart({ data }: { data: SalesDailyPoint[] }) {
  const [tip, setTip] = useState<ChartTip>(null)

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
        {coords.map((point) => {
          const text = `${formatShortDate(point.item.date)} ${formatCurrency(point.item.salesAmount)}`
          return (
            <g key={point.item.date}>
              <circle
                cx={point.x}
                cy={point.y}
                r={2.4}
                className="daily-trend-dot"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={8}
                className="daily-trend-hit"
                onMouseEnter={(event) =>
                  setTip({ x: event.clientX, y: event.clientY, text })
                }
                onMouseMove={(event) =>
                  setTip({ x: event.clientX, y: event.clientY, text })
                }
                onMouseLeave={() => setTip(null)}
              >
                <title>{text}</title>
              </circle>
            </g>
          )
        })}
      </svg>
      <div className="daily-trend-range">
        <span>{formatShortDate(data[0].date)}</span>
        <span>{formatShortDate(data[data.length - 1].date)}</span>
      </div>
      <ChartTooltip tip={tip} />
    </div>
  )
}

export function SalesAnalysisPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const refreshForecastAfterUpload =
    (location.state as { refreshForecastAfterUpload?: boolean } | null)
      ?.refreshForecastAfterUpload === true
  const [availableMonths, setAvailableMonths] = useState<string[] | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [status, setStatus] = useState<'COMPLETED' | 'EMPTY' | null>(null)
  const [data, setData] = useState<SalesAnalysisData | null>(null)
  const [expectedForecast, setExpectedForecast] =
    useState<SalesExpectedForecast | null>(null)
  const [forecastRefreshStatus, setForecastRefreshStatus] = useState<
    'idle' | 'checking' | 'unavailable'
  >('idle')
  const [forecastRetryKey, setForecastRetryKey] = useState(0)
  const [isLoadingMonths, setIsLoadingMonths] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [chartIndex, setChartIndex] = useState(0)
  const [menuCursor, setMenuCursor] = useState(0)
  const [hoverTip, setHoverTip] = useState<ChartTip>(null)
  const touchStartXRef = useRef<number | null>(null)
  const hourlyChartScrollRef = useRef<HTMLDivElement>(null)

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
        setChartIndex(0)
        setMenuCursor(0)
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

  useEffect(() => {
    if (!selectedMonth || !availableMonths?.length) return
    if (selectedMonth !== availableMonths[availableMonths.length - 1]) {
      setExpectedForecast(null)
      setForecastRefreshStatus('idle')
      return
    }

    let ignore = false
    let retryTimeout: ReturnType<typeof setTimeout> | undefined
    let retryCount = 0
    let initialForecastAmount: number | null = null
    let sawEmptyForecast = false
    setExpectedForecast(null)
    setForecastRefreshStatus('checking')

    const checkForecast = async () => {
      try {
        const response = await getSalesExpectedForecast()
        if (ignore) return
        if (response.status === 'COMPLETED') {
          setExpectedForecast(response.data)
          if (
            !refreshForecastAfterUpload ||
            sawEmptyForecast ||
            (initialForecastAmount !== null &&
              response.data.expectedSalesAmount !== initialForecastAmount) ||
            retryCount >= FORECAST_MAX_RETRIES
          ) {
            setForecastRefreshStatus('idle')
            return
          }
          initialForecastAmount = response.data.expectedSalesAmount
        } else {
          sawEmptyForecast = true
        }
        if (retryCount >= FORECAST_MAX_RETRIES) {
          setForecastRefreshStatus('unavailable')
          return
        }
        retryCount += 1
        retryTimeout = setTimeout(checkForecast, FORECAST_RETRY_INTERVAL_MS)
      } catch (requestError) {
        if (ignore) return
        if (isUnauthorized(requestError)) {
          navigate('/login')
          return
        }
        setForecastRefreshStatus('unavailable')
      }
    }

    void checkForecast()
    return () => {
      ignore = true
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [
    availableMonths,
    forecastRetryKey,
    navigate,
    refreshForecastAfterUpload,
    selectedMonth,
  ])

  useEffect(() => {
    if (chartIndex !== 0 || !data?.hourlySales.length) return

    const animationFrame = requestAnimationFrame(() => {
      const viewport = hourlyChartScrollRef.current
      if (!viewport) return

      const noonIndex = Math.max(
        0,
        data.hourlySales.findIndex((item) => item.hour === 12),
      )
      const itemWidth = viewport.scrollWidth / data.hourlySales.length
      const centeredScrollLeft =
        itemWidth * (noonIndex + 0.5) - viewport.clientWidth / 2

      viewport.scrollLeft = Math.max(0, centeredScrollLeft)
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [chartIndex, data?.hourlySales])

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

  const chartTabs = [
    { key: 'hourly', title: '시간대별 매출' },
    { key: 'daily', title: '일별 매출 추이' },
    { key: 'weekday', title: '요일별 매출' },
    { key: 'menu', title: '메뉴별 매출 순위' },
  ] as const

  const goToChart = (index: number) => {
    setChartIndex(Math.max(0, Math.min(chartTabs.length - 1, index)))
  }

  const handleChartTouchStart = (event: TouchEvent) => {
    touchStartXRef.current = event.touches[0].clientX
  }

  const handleChartTouchEnd = (event: TouchEvent) => {
    if (touchStartXRef.current === null) return
    const deltaX = event.changedTouches[0].clientX - touchStartXRef.current
    touchStartXRef.current = null
    const SWIPE_THRESHOLD = 40
    if (deltaX > SWIPE_THRESHOLD) {
      goToChart(chartIndex - 1)
    } else if (deltaX < -SWIPE_THRESHOLD) {
      goToChart(chartIndex + 1)
    }
  }

  function renderChartBody() {
    if (!data) return null
    const activeKey = chartTabs[chartIndex].key

    if (activeKey === 'hourly') {
      if (data.hourlySales.length === 0) {
        return (
          <p className="chart-empty">표시할 시간대별 매출 데이터가 없습니다.</p>
        )
      }
      return (
        <div
          ref={hourlyChartScrollRef}
          className="hourly-chart-scroll"
          aria-label="시간대별 매출 그래프 가로 스크롤 영역"
          onTouchStart={(event) => event.stopPropagation()}
          onTouchEnd={(event) => event.stopPropagation()}
        >
          <div className="hourly-chart-content">
            <div className="sales-chart" aria-label="시간대별 매출">
              {data.hourlySales.map((item) => {
                const text = `${item.hour}시 ${formatCurrency(item.salesAmount)}`
                return (
                  <span
                    key={item.hour}
                    style={{
                      height: `${Math.max(4, (item.salesAmount / hourlyMax) * 100)}%`,
                    }}
                    aria-label={text}
                    title={text}
                    onMouseEnter={(event) =>
                      setHoverTip({ x: event.clientX, y: event.clientY, text })
                    }
                    onMouseMove={(event) =>
                      setHoverTip({ x: event.clientX, y: event.clientY, text })
                    }
                    onMouseLeave={() => setHoverTip(null)}
                  />
                )
              })}
            </div>
            <div className="sales-chart-labels">
              {data.hourlySales.map((item) => (
                <span key={item.hour}>{item.hour}시</span>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (activeKey === 'daily') {
      return <DailyTrendChart data={data.dailySales} />
    }

    if (activeKey === 'weekday') {
      return (
        <>
          <div className="sales-chart" aria-label="요일별 매출">
            {data.weekdaySales.map((item) => {
              const text = `${weekdayLabels[item.dayOfWeek] ?? item.dayOfWeek} ${formatCurrency(item.salesAmount)}`
              return (
                <span
                  key={item.dayOfWeek}
                  style={{
                    height: `${Math.max(4, (item.salesAmount / weekdayMax) * 100)}%`,
                  }}
                  aria-label={text}
                  title={text}
                  onMouseEnter={(event) =>
                    setHoverTip({ x: event.clientX, y: event.clientY, text })
                  }
                  onMouseMove={(event) =>
                    setHoverTip({ x: event.clientX, y: event.clientY, text })
                  }
                  onMouseLeave={() => setHoverTip(null)}
                />
              )
            })}
          </div>
          <div className="sales-chart-labels">
            {data.weekdaySales.map((item) => (
              <span key={item.dayOfWeek}>
                {weekdayLabels[item.dayOfWeek] ?? item.dayOfWeek}
              </span>
            ))}
          </div>
        </>
      )
    }

    const visibleMenuRankings = data.menuRankings.filter(
      (item) => item.salesAmount > 0,
    )
    if (visibleMenuRankings.length === 0) {
      return (
        <p className="chart-empty">표시할 메뉴별 매출 데이터가 없습니다.</p>
      )
    }
    const menuTotalPages = Math.ceil(
      visibleMenuRankings.length / MENU_PAGE_SIZE,
    )
    const menuPage = Math.min(
      menuTotalPages,
      Math.floor(menuCursor / MENU_PAGE_SIZE) + 1,
    )
    const menuPageItems = visibleMenuRankings.slice(
      menuCursor,
      menuCursor + MENU_PAGE_SIZE,
    )
    return (
      <>
        <ol className="menu-ranking-list">
          {menuPageItems.map((item) => (
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
        {menuTotalPages > 1 && (
          <div className="menu-pagination">
            <button
              type="button"
              disabled={menuCursor <= 0}
              onClick={() =>
                setMenuCursor((prev) => Math.max(0, prev - MENU_PAGE_SIZE))
              }
            >
              이전
            </button>
            <span>
              {menuPage} / {menuTotalPages}
            </span>
            <button
              type="button"
              disabled={
                menuCursor + MENU_PAGE_SIZE >= visibleMenuRankings.length
              }
              onClick={() =>
                setMenuCursor((prev) =>
                  Math.min(
                    (menuTotalPages - 1) * MENU_PAGE_SIZE,
                    prev + MENU_PAGE_SIZE,
                  ),
                )
              }
            >
              다음
            </button>
          </div>
        )}
      </>
    )
  }

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
            {expectedForecast && (
              <section
                className="forecast-total-card"
                aria-label={`${formatMonthLabel(expectedForecast.targetMonth)} 예상 총매출`}
              >
                <div className="forecast-total-card-header">
                  <small>
                    {formatMonthLabel(expectedForecast.targetMonth)} 예상 총매출
                  </small>
                </div>
                <strong>
                  {formatCurrency(expectedForecast.expectedSalesAmount)}
                </strong>
                {expectedForecast.actualSalesAmount > 0 ? (
                  <div className="forecast-breakdown">
                    <div>
                      <span>누적 매출</span>
                      <b>
                        {formatCurrency(expectedForecast.actualSalesAmount)}
                      </b>
                    </div>
                    <div>
                      <span>남은 기간 예측</span>
                      <b>
                        {formatCurrency(expectedForecast.forecastSalesAmount)}
                      </b>
                    </div>
                  </div>
                ) : (
                  <p className="forecast-range">
                    예상 범위 {formatCurrency(expectedForecast.lowerBound)} -{' '}
                    {formatCurrency(expectedForecast.upperBound)}
                  </p>
                )}
              </section>
            )}
            {!expectedForecast &&
              selectedMonth === availableMonths?.[availableMonths.length - 1] &&
              forecastRefreshStatus === 'checking' && (
                <p className="forecast-feedback" role="status">
                  예상 총매출을 확인하고 있어요.
                </p>
              )}
            {!expectedForecast &&
              selectedMonth === availableMonths?.[availableMonths.length - 1] &&
              forecastRefreshStatus === 'unavailable' && (
                <div className="forecast-feedback" role="status">
                  <p>아직 예상 총매출을 불러오지 못했어요.</p>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => setForecastRetryKey((key) => key + 1)}
                  >
                    다시 확인
                  </button>
                </div>
              )}
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

            {data.aiInsight &&
              (data.aiInsight.insights.length > 0 ||
                data.aiInsight.helperText) && (
                <div
                  className={`ai-insight-box${
                    data.aiInsight.status === 'COMPLETED'
                      ? ''
                      : ' ai-insight-box--notice'
                  }`}
                >
                  {data.aiInsight.status === 'COMPLETED' ? (
                    <>
                      <h2>AI가 발견했어요</h2>
                      <ul>
                        {data.aiInsight.insights.map((insight) => (
                          <li key={insight}>{insight}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      <h2>AI 인사이트 안내</h2>
                      <p>{data.aiInsight.helperText}</p>
                    </>
                  )}
                </div>
              )}

            <section className="analysis-chart-section">
              <h2>분석 그래프</h2>

              <div
                className="chart-carousel"
                onTouchStart={handleChartTouchStart}
                onTouchEnd={handleChartTouchEnd}
              >
                <button
                  type="button"
                  className="chart-carousel-arrow"
                  aria-label="이전 그래프 보기"
                  disabled={chartIndex <= 0}
                  onClick={() => goToChart(chartIndex - 1)}
                >
                  ◀
                </button>

                <div className="section-card chart-card">
                  <h3>{chartTabs[chartIndex].title}</h3>
                  {renderChartBody()}
                  <ChartTooltip tip={hoverTip} />
                </div>

                <button
                  type="button"
                  className="chart-carousel-arrow"
                  aria-label="다음 그래프 보기"
                  disabled={chartIndex >= chartTabs.length - 1}
                  onClick={() => goToChart(chartIndex + 1)}
                >
                  ▶
                </button>
              </div>

              <div
                className="chart-dots"
                role="tablist"
                aria-label="그래프 종류 선택"
              >
                {chartTabs.map((tab, index) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={index === chartIndex}
                    aria-label={tab.title}
                    onClick={() => goToChart(index)}
                  />
                ))}
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
