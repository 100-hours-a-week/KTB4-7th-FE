import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { SalesAnalysisPage } from './SalesAnalysisPage'
import { SolutionPage } from './SolutionPage'

const {
  getSalesAnalysis,
  getSalesAvailableMonths,
  getNotifications,
  getTodaySolution,
} = vi.hoisted(() => ({
  getSalesAnalysis: vi.fn(),
  getSalesAvailableMonths: vi.fn(),
  getNotifications: vi.fn(),
  getTodaySolution: vi.fn(),
}))

vi.mock('../features/sales/api/salesApi', () => ({
  getSalesAnalysis,
  getSalesAvailableMonths,
}))

vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

vi.mock('../features/solution/api/solutionApi', () => ({
  getTodaySolution,
}))

beforeEach(() => {
  getSalesAnalysis.mockReset()
  getSalesAvailableMonths.mockReset()
  getNotifications.mockReset()
  getTodaySolution.mockReset()
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })
})

test('솔루션이 없으면 매출 업로드 행동을 제공한다', async () => {
  getTodaySolution.mockResolvedValue({
    message: '데이터를 추가해 매출 분석을 받아보세요.',
    status: 'EMPTY',
    data: {
      storeName: null,
      screenTitle: null,
      solutionBundleId: null,
      targetDate: '2026-09-27',
      solutionCards: [],
    },
  })

  render(
    <MemoryRouter>
      <SolutionPage />
    </MemoryRouter>,
  )
  expect(
    await screen.findByRole('heading', {
      name: '아직 제공된 솔루션이 없습니다',
    }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: '매출 데이터 업로드' }),
  ).toHaveAttribute('href', '/sales/upload')
})

test('분석 가능한 월이 없으면 업로드 행동을 제공한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: [] })

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
