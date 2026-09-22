import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardFixtures } from '../entities/dashboard/model/fixtures'
import { EmptyState } from '../shared/ui/EmptyState'
import { AppShell } from '../shared/ui/AppShell'

type SalesFixture = typeof dashboardFixtures.sales

const periods = [
  { id: 'today', label: '오늘' },
  { id: 'week', label: '이번 주' },
  { id: 'month', label: '이번 달' },
] as const

function TrendBadge({ change }: { change: string }) {
  const isPositive = change.trim().startsWith('+')
  return (
    <span
      className={isPositive ? 'trend-badge trend-up' : 'trend-badge trend-down'}
    >
      {isPositive ? '▲' : '▼'} {change.replace(/^[+-]/, '')}
    </span>
  )
}

export function SalesAnalysisPage({
  sales = dashboardFixtures.sales,
}: {
  sales?: SalesFixture | null
}) {
  const [period, setPeriod] = useState<(typeof periods)[number]['id']>('month')

  if (!sales) {
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

  return (
    <AppShell title="매출 분석">
      <div className="page-stack sales-analysis-page">
        <header className="page-title analysis-page-title">
          <div>
            <p>SALES ANALYSIS</p>
            <h1>매출 분석</h1>
            <span>기간별 매출 흐름을 한눈에 확인해보세요</span>
          </div>
          <div className="period-tabs" role="tablist" aria-label="분석 기간">
            {periods.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={period === item.id}
                className={period === item.id ? 'active' : ''}
                onClick={() => setPeriod(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="stat-card-grid">
          <div className="stat-card">
            <small>총 매출</small>
            <strong>{sales.total}</strong>
            <TrendBadge change={sales.change} />
            <span className="stat-card-caption">지난달 대비</span>
          </div>
          <div className="stat-card">
            <small>주문 건수</small>
            <strong>{sales.orders}</strong>
            <TrendBadge change={sales.ordersChange} />
            <span className="stat-card-caption">지난달 대비</span>
          </div>
          <div className="stat-card">
            <small>평균 객단가</small>
            <strong>{sales.averageOrder}</strong>
            <TrendBadge change={sales.averageOrderChange} />
            <span className="stat-card-caption">지난달 대비</span>
          </div>
        </div>

        <div className="ai-insight-box">
          <h2>AI가 발견했어요</h2>
          <ul>
            {sales.insights.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
        </div>

        <section className="analysis-chart-section">
          <h2>분석 그래프</h2>
          <div className="chart-carousel">
            <button
              type="button"
              className="chart-carousel-arrow"
              aria-label="이전 그래프"
            >
              ‹
            </button>
            <div className="section-card chart-card">
              <h3>요일별 매출</h3>
              <div className="sales-chart" aria-label="요일별 매출">
                {sales.daily.map((value, index) => (
                  <span
                    key={index}
                    className={index === sales.flaggedDayIndex ? 'flagged' : ''}
                    style={{ height: `${value}%` }}
                  />
                ))}
              </div>
              <p className="chart-caption">{sales.daily7DayCaption}</p>
            </div>
            <button
              type="button"
              className="chart-carousel-arrow"
              aria-label="다음 그래프"
            >
              ›
            </button>
          </div>
          <div className="chart-dots" aria-hidden="true">
            <span className="active" />
            <span />
            <span />
          </div>
        </section>

        <Link className="secondary-action" to="/sales/upload">
          다른 파일 선택
        </Link>
      </div>
    </AppShell>
  )
}
