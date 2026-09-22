import { Link } from 'react-router-dom'
import { dashboardFixtures } from '../entities/dashboard/model/fixtures'
import { EmptyState } from '../shared/ui/EmptyState'
import { SectionCard } from '../shared/ui/SectionCard'
import { AppShell } from '../shared/ui/AppShell'

type SalesFixture = typeof dashboardFixtures.sales
export function SalesAnalysisPage({
  sales = dashboardFixtures.sales,
}: {
  sales?: SalesFixture | null
}) {
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
        <header className="page-title">
          <p>THIS WEEK</p>
          <h1>이번 주 매출 흐름</h1>
          <span>업로드된 매출 데이터를 바탕으로 만든 목업 분석입니다.</span>
        </header>
        <SectionCard eyebrow="TOTAL SALES" title={sales.total}>
          <p className="positive-change">지난주보다 {sales.change}</p>
          <div className="sales-chart" aria-label="최근 7일 매출 추이">
            {sales.daily.map((value, index) => (
              <span key={index} style={{ height: `${value}%` }} />
            ))}
          </div>
        </SectionCard>
        <div className="metric-grid">
          <SectionCard eyebrow="ORDERS" title={sales.orders}>
            <p>이번 주 주문 수</p>
          </SectionCard>
          <SectionCard eyebrow="AVERAGE" title={sales.averageOrder}>
            <p>평균 객단가</p>
          </SectionCard>
        </div>
        <Link className="secondary-action" to="/sales/upload">
          다른 파일 선택
        </Link>
      </div>
    </AppShell>
  )
}
