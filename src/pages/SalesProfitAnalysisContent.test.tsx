import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SalesProfitAnalysisContent } from './SalesProfitAnalysisContent'

const { getProfitAnalysis, navigate } = vi.hoisted(() => ({
  getProfitAnalysis: vi.fn(), navigate: vi.fn(),
}))

vi.mock('../features/sales/api/salesApi', () => ({ getProfitAnalysis }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  getProfitAnalysis.mockReset()
  navigate.mockReset()
})

function renderContent() {
  return render(<MemoryRouter><SalesProfitAnalysisContent targetMonth="2026-09" uploadId={12} /></MemoryRouter>)
}

test('총매출 0원이면 순이익률은 숫자 대신 대시를 표시한다', async () => {
  getProfitAnalysis.mockResolvedValue({
    status: 'COMPLETED', message: '조회에 성공했습니다.',
    data: {
      summary: { totalNetAmount: 0, ingredientCost: 0, fixedCost: 100,
        totalCost: 100, netProfit: -100, netProfitRate: null,
        previousNetProfit: null, netProfitChangeRate: null,
        previousTotalCost: null, totalCostChangeRate: null,
        previousNetProfitRate: null, netProfitRateDifference: null },
      dailyProfits: [{ date: '2026-09-01', netProfit: -100 }],
      weekdayProfits: [{ dayOfWeek: 'TUESDAY', netProfit: -100 }],
      aiInsight: { status: 'FAILED', insights: [] },
    },
  })

  renderContent()

  const rateCard = (await screen.findByText('순이익률')).closest('.stat-card')!
  expect(within(rateCard as HTMLElement).getByText('-')).toBeInTheDocument()
  expect(screen.getByText('-100원', { selector: '.stat-card strong' })).toBeInTheDocument()
  expect(screen.getByText('표시할 인사이트가 아직 없습니다.')).toBeInTheDocument()
  expect(getProfitAnalysis).toHaveBeenCalledWith('2026-09-01', '2026-09-30')
})

test('데이터가 없으면 순이익 카드를 표시하지 않는다', async () => {
  getProfitAnalysis.mockResolvedValue({ status: 'EMPTY', message: '', data: null })
  renderContent()
  expect(await screen.findByText('선택한 달의 매출 데이터가 없습니다.')).toBeInTheDocument()
  expect(screen.queryByText('순이익률')).not.toBeInTheDocument()
})

test('인증 만료는 로그인 화면으로 이동한다', async () => {
  getProfitAnalysis.mockRejectedValue({ response: { status: 401 } })
  renderContent()
  await screen.findByText('순이익 분석을 불러오는 중...')
  await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'))
})
