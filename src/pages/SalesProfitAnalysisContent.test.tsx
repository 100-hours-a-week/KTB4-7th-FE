import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SalesProfitAnalysisContent } from './SalesProfitAnalysisContent'

const { getProfitAnalysis, navigate } = vi.hoisted(() => ({
  getProfitAnalysis: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/sales/api/salesApi', () => ({ getProfitAnalysis }))
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  getProfitAnalysis.mockReset()
  navigate.mockReset()
})

function renderContent() {
  return render(
    <MemoryRouter>
      <SalesProfitAnalysisContent targetMonth="2026-09" uploadId={12} />
    </MemoryRouter>,
  )
}

function pointerEvent(type: string, clientX: number, pointerType: string) {
  const event = new MouseEvent(type, { bubbles: true, clientX })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  return event
}

test('총매출 0원이면 순이익률은 숫자 대신 대시를 표시한다', async () => {
  getProfitAnalysis.mockResolvedValue({
    status: 'COMPLETED',
    message: '조회에 성공했습니다.',
    data: {
      summary: {
        totalNetAmount: 0,
        ingredientCost: 0,
        fixedCost: 100,
        totalCost: 100,
        netProfit: -100,
        netProfitRate: null,
        previousNetProfit: null,
        netProfitChangeRate: null,
        previousTotalCost: null,
        totalCostChangeRate: null,
        previousNetProfitRate: null,
        netProfitRateDifference: null,
      },
      dailyProfits: [{ date: '2026-09-01', netProfit: -100 }],
      weekdayProfits: [{ dayOfWeek: 'TUESDAY', netProfit: -100 }],
      aiInsight: { status: 'FAILED', insights: [] },
    },
  })

  renderContent()

  const rateCard = (await screen.findByText('순이익률')).closest('.stat-card')!
  expect(within(rateCard as HTMLElement).getByText('-')).toBeInTheDocument()
  expect(
    screen.getByText('-100원', { selector: '.stat-card strong' }),
  ).toBeInTheDocument()
  expect(
    screen.getByText('표시할 인사이트가 아직 없습니다.'),
  ).toBeInTheDocument()
  expect(getProfitAnalysis).toHaveBeenCalledWith('2026-09-01', '2026-09-30')
})

test('데이터가 없으면 순이익 카드를 표시하지 않는다', async () => {
  getProfitAnalysis.mockResolvedValue({
    status: 'EMPTY',
    message: '',
    data: null,
  })
  renderContent()
  expect(
    await screen.findByText('선택한 달의 매출 데이터가 없습니다.'),
  ).toBeInTheDocument()
  expect(screen.queryByText('순이익률')).not.toBeInTheDocument()
})

test('전월 대비 감소는 파랑, 증가는 빨강으로 표시한다', async () => {
  getProfitAnalysis.mockResolvedValue({
    status: 'COMPLETED',
    message: '조회에 성공했습니다.',
    data: {
      summary: {
        totalNetAmount: 1000,
        ingredientCost: 0,
        fixedCost: 0,
        totalCost: 100,
        netProfit: 900,
        netProfitRate: 0.9,
        previousNetProfit: 1000,
        netProfitChangeRate: -0.1,
        previousTotalCost: 80,
        totalCostChangeRate: 0.25,
        previousNetProfitRate: 0.8,
        netProfitRateDifference: 0.1,
      },
      dailyProfits: [],
      weekdayProfits: [],
      aiInsight: null,
    },
  })
  renderContent()

  expect(await screen.findByText('이전 달 대비 -10.0%')).toHaveClass('negative')
  expect(screen.getByText('이전 달 대비 +25.0%')).toHaveClass('positive')
  expect(screen.getByText('이전 달 대비 +10.0%p')).toHaveClass('positive')
})

test('일별 그래프에 마우스나 터치를 대면 해당 날짜와 순이익을 바로 보여준다', async () => {
  getProfitAnalysis.mockResolvedValue({
    status: 'COMPLETED',
    message: '조회에 성공했습니다.',
    data: {
      summary: {
        totalNetAmount: 1000,
        ingredientCost: 0,
        fixedCost: 0,
        totalCost: 0,
        netProfit: 1000,
        netProfitRate: 1,
        previousNetProfit: null,
        netProfitChangeRate: null,
        previousTotalCost: null,
        totalCostChangeRate: null,
        previousNetProfitRate: null,
        netProfitRateDifference: null,
      },
      dailyProfits: [
        { date: '2026-09-01', netProfit: -12500 },
        { date: '2026-09-02', netProfit: 34500 },
        { date: '2026-09-03', netProfit: 67800 },
      ],
      weekdayProfits: [],
      aiInsight: null,
    },
  })
  renderContent()

  const chart = await screen.findByRole('group', {
    name: /일별 순이익 추이 그래프/,
  })
  vi.spyOn(chart, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    width: 300,
    right: 300,
    top: 0,
    bottom: 220,
    height: 220,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })

  fireEvent(chart, pointerEvent('pointermove', 150, 'mouse'))
  expect(screen.getByRole('status')).toHaveTextContent('2026-09-02')
  expect(screen.getByRole('status')).toHaveTextContent('34,500원')

  fireEvent(chart, pointerEvent('pointerout', 150, 'mouse'))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()

  fireEvent(chart, pointerEvent('pointerdown', 0, 'touch'))
  expect(screen.getByRole('status')).toHaveTextContent('-12,500원')

  fireEvent.keyDown(chart, { key: 'ArrowRight' })
  expect(screen.getByRole('status')).toHaveTextContent('34,500원')
})

test('요일별 그래프는 금액을 툴팁으로 표시하고 음수도 확인할 수 있다', async () => {
  getProfitAnalysis.mockResolvedValue({
    status: 'COMPLETED',
    message: '조회에 성공했습니다.',
    data: {
      summary: {
        totalNetAmount: 1000,
        ingredientCost: 0,
        fixedCost: 0,
        totalCost: 0,
        netProfit: 1000,
        netProfitRate: 1,
        previousNetProfit: null,
        netProfitChangeRate: null,
        previousTotalCost: null,
        totalCostChangeRate: null,
        previousNetProfitRate: null,
        netProfitRateDifference: null,
      },
      dailyProfits: [],
      weekdayProfits: [
        { dayOfWeek: 'MONDAY', netProfit: 2839463 },
        { dayOfWeek: 'TUESDAY', netProfit: -1689400 },
      ],
      aiInsight: null,
    },
  })
  renderContent()

  const chart = await screen.findByRole('group', {
    name: '요일별 순이익 막대 그래프',
  })
  expect(within(chart).queryByText('2,839,463원')).not.toBeInTheDocument()

  const monday = within(chart).getByRole('button', {
    name: '월요일 순이익 2,839,463원',
  })
  fireEvent.pointerOver(monday)
  expect(screen.getByRole('status')).toHaveTextContent('월요일 순이익')
  expect(screen.getByRole('status')).toHaveTextContent('2,839,463원')

  const tuesday = within(chart).getByRole('button', {
    name: '화요일 순이익 -1,689,400원',
  })
  fireEvent.pointerDown(tuesday)
  expect(screen.getByRole('status')).toHaveTextContent('-1,689,400원')
})

test('인증 만료는 로그인 화면으로 이동한다', async () => {
  getProfitAnalysis.mockRejectedValue({ response: { status: 401 } })
  renderContent()
  await screen.findByText('순이익 분석을 불러오는 중...')
  await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'))
})
