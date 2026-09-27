import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SalesAnalysisPage } from './SalesAnalysisPage'

const { getSalesAnalysis, getNotifications, navigate } = vi.hoisted(() => ({
  getSalesAnalysis: vi.fn(),
  getNotifications: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/sales/api/salesApi', () => ({
  getSalesAnalysis,
}))

vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

const completedResponse = {
  status: 'COMPLETED' as const,
  message: '조회에 성공했습니다.',
  data: {
    period: {
      type: 'THIS_MONTH' as const,
      startDate: '2026-09-01',
      endDate: '2026-09-27',
    },
    comparisonPeriod: { startDate: '2026-08-01', endDate: '2026-08-27' },
    kpis: {
      totalSales: 7920000,
      orderCount: 923,
      averageOrderValue: 8582,
      changes: {
        totalSalesRate: 4.2,
        orderCountRate: 2.6,
        averageOrderValueRate: -0.8,
      },
    },
    dailySales: [],
    menuRankings: [],
    hourlySales: [],
    weekdaySales: [
      { dayOfWeek: 'MONDAY' as const, salesAmount: 420000 },
      { dayOfWeek: 'TUESDAY' as const, salesAmount: 340000 },
      { dayOfWeek: 'WEDNESDAY' as const, salesAmount: 560000 },
      { dayOfWeek: 'THURSDAY' as const, salesAmount: 480000 },
      { dayOfWeek: 'FRIDAY' as const, salesAmount: 640000 },
      { dayOfWeek: 'SATURDAY' as const, salesAmount: 830000 },
      { dayOfWeek: 'SUNDAY' as const, salesAmount: 740000 },
    ],
    aiInsight: {
      targetMonth: '2026-09',
      insights: ['최근 화요일 매출이 3주 연속 감소하고 있어요.'],
      generatedAt: '2026-09-27T00:00:00+09:00',
    },
  },
}

beforeEach(() => {
  getSalesAnalysis.mockReset()
  getNotifications.mockReset()
  navigate.mockReset()
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })
})

test('매출 분석 데이터를 불러와 통계와 AI 인사이트를 표시한다', async () => {
  getSalesAnalysis.mockResolvedValue(completedResponse)

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  expect(await screen.findByText('₩7,920,000')).toBeInTheDocument()
  expect(screen.getByText('923건')).toBeInTheDocument()
  expect(screen.getByText('₩8,582')).toBeInTheDocument()
  expect(
    screen.getByText('최근 화요일 매출이 3주 연속 감소하고 있어요.'),
  ).toBeInTheDocument()
  expect(getSalesAnalysis).toHaveBeenCalledWith({ periodType: 'THIS_MONTH' })
})

test('기간 탭을 클릭하면 해당 periodType으로 다시 조회한다', async () => {
  getSalesAnalysis.mockResolvedValue(completedResponse)

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  await screen.findByText('₩7,920,000')

  fireEvent.click(screen.getByRole('tab', { name: '오늘' }))

  await waitFor(() =>
    expect(getSalesAnalysis).toHaveBeenLastCalledWith({ periodType: 'TODAY' }),
  )
})

test('분석 데이터가 없으면 업로드 행동을 제공한다', async () => {
  getSalesAnalysis.mockResolvedValue({
    status: 'EMPTY',
    message: '선택 기간에 매출 데이터가 없습니다.',
    data: {
      ...completedResponse.data,
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
  expect(
    screen.getByRole('link', { name: '매출 데이터 업로드' }),
  ).toHaveAttribute('href', '/sales/upload')
})

test('세션이 없으면 로그인 페이지로 이동한다', async () => {
  getSalesAnalysis.mockRejectedValue({ response: { status: 401 } })

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'))
})
