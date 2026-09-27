import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { SalesAnalysisPage } from './SalesAnalysisPage'
import { SolutionPage } from './SolutionPage'

const { getSalesAnalysis, getNotifications } = vi.hoisted(() => ({
  getSalesAnalysis: vi.fn(),
  getNotifications: vi.fn(),
}))

vi.mock('../features/sales/api/salesApi', () => ({
  getSalesAnalysis,
}))

vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

beforeEach(() => {
  getSalesAnalysis.mockReset()
  getNotifications.mockReset()
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })
})

test('솔루션이 없으면 매출 업로드 행동을 제공한다', () => {
  render(
    <MemoryRouter>
      <SolutionPage
        summary={{
          availability: 'unavailable',
          storeName: '맴매',
          solutions: [],
        }}
      />
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('heading', { name: '아직 제공된 솔루션이 없습니다' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: '매출 데이터 업로드' }),
  ).toHaveAttribute('href', '/sales/upload')
})

test('분석 데이터가 없으면 업로드 행동을 제공한다', async () => {
  getSalesAnalysis.mockResolvedValue({
    status: 'EMPTY',
    message: '선택 기간에 매출 데이터가 없습니다.',
    data: {
      period: {
        type: 'THIS_MONTH',
        startDate: '2026-09-01',
        endDate: '2026-09-27',
      },
      comparisonPeriod: null,
      kpis: {
        totalSales: 0,
        orderCount: 0,
        averageOrderValue: 0,
        changes: {
          totalSalesRate: null,
          orderCountRate: null,
          averageOrderValueRate: null,
        },
      },
      dailySales: [],
      menuRankings: [],
      hourlySales: [],
      weekdaySales: [],
      aiInsight: null,
    },
  })

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )
  expect(
    await screen.findByRole('heading', {
      name: '분석할 매출 데이터가 없습니다',
    }),
  ).toBeInTheDocument()
})

test('로그인 화면도 모바일 앱 컨테이너에서 렌더링한다', () => {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
  expect(screen.getByRole('main')).toHaveClass('mobile-app-shell')
})
