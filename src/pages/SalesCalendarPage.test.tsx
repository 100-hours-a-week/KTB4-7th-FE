import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { SalesCalendarPage } from './SalesCalendarPage'
import type { SalesCalendarData } from '../features/sales/api/salesCalendarApi'

const { getSalesCalendar } = vi.hoisted(() => ({ getSalesCalendar: vi.fn() }))
vi.mock('../features/sales/api/salesCalendarApi', () => ({ getSalesCalendar }))
vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications: vi.fn().mockResolvedValue({ data: { items: [] } }),
}))

function response(
  month = '2026-10',
  selectedDate = `${month}-30`,
): SalesCalendarData {
  const day = {
    date: `${month}-30`,
    dayOfWeek: 'FRIDAY',
    isToday: selectedDate === '2026-10-30',
    isSelected: true,
    dataStatus: 'COMPLETE' as const,
    salesAmount: 10000,
    orderCount: 2,
    salesLevel: 'HIGH' as const,
    weather: { condition: 'RAIN' as const },
  }
  return {
    month,
    timezone: 'Asia/Seoul',
    availableRange: { firstMonth: '2026-09', lastMonth: '2026-10' },
    selectedDate,
    monthSummary: {
      totalSalesAmount: 10000,
      totalOrderCount: 2,
      averageDailySalesAmount: 5000,
      dataDayCount: 1,
    },
    days: [
      day,
      {
        ...day,
        date: `${month}-${month === '2026-09' ? '01' : '31'}`,
        isSelected: selectedDate === `${month}-31`,
        isToday: false,
        dataStatus: 'FUTURE',
        salesAmount: null,
        orderCount: null,
        salesLevel: 'UNAVAILABLE',
        weather: null,
      },
    ],
    selectedDay: {
      date: selectedDate,
      dataStatus: 'COMPLETE',
      salesAmount: 10000,
      orderCount: 2,
      averageOrderAmount: 5000,
      insight: {
        salesLevel: 'HIGH',
        monthlyAverageSalesAmount: 5000,
        deviationRate: 1,
      },
    },
  }
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/sales/calendar']}>
        <Routes>
          <Route path="/sales/calendar" element={<SalesCalendarPage />} />
          <Route path="/login" element={<p>로그인 화면</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.setSystemTime(new Date('2026-10-29T15:30:00Z'))
  getSalesCalendar.mockReset()
  getSalesCalendar.mockResolvedValue(response())
})
afterEach(() => vi.useRealTimers())

test('서울 기준 현재 월로 조회하고 날씨, 선택일, 매출 수준을 표시한다', async () => {
  mount()
  expect(await screen.findByLabelText('월간 매출 달력')).toBeInTheDocument()
  expect(getSalesCalendar).toHaveBeenCalledWith({
    month: '2026-10',
    selectedDate: undefined,
  })
  expect(screen.getByRole('button', { name: '다음 달' })).toBeDisabled()
  const detail = within(screen.getByLabelText('선택한 날짜 상세'))
  expect(detail.getByText('2026년 10월 30일 금요일')).toBeInTheDocument()
  expect(detail.getByText('비')).toBeInTheDocument()
  expect(detail.getByText('월평균보다 높은 매출')).toBeInTheDocument()
  expect(screen.getByText(/주문한 날 기준/)).toBeInTheDocument()
})

test('미래 날짜도 같은 월 API로 선택하며 상세를 갱신한다', async () => {
  getSalesCalendar.mockImplementation(async ({ month, selectedDate }) =>
    response(month, selectedDate),
  )
  mount()
  fireEvent.click(
    await screen.findByRole('button', { name: /2026년 10월 31일/ }),
  )
  await waitFor(() =>
    expect(getSalesCalendar).toHaveBeenCalledWith({
      month: '2026-10',
      selectedDate: '2026-10-31',
    }),
  )
  expect(
    await screen.findByRole('button', { name: /2026년 10월 31일/ }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('월 이동은 시작 월에서 멈추고 선택 날짜를 초기화한다', async () => {
  getSalesCalendar.mockImplementation(async ({ month, selectedDate }) =>
    response(
      month,
      selectedDate ?? (month === '2026-10' ? '2026-10-30' : '2026-09-01'),
    ),
  )
  mount()
  fireEvent.click(await screen.findByRole('button', { name: '이전 달' }))
  await waitFor(() =>
    expect(getSalesCalendar).toHaveBeenCalledWith({
      month: '2026-09',
      selectedDate: undefined,
    }),
  )
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '이전 달' })).toBeDisabled(),
  )
  expect(screen.getByText('2026년 9월 1일 화요일')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '다음 달' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '다음 달' })).toBeDisabled(),
  )
})

test('데이터가 없는 월과 누락 날씨, 0건은 빈 상태로 표시한다', async () => {
  const data = response()
  data.monthSummary.dataDayCount = 0
  data.days = data.days.map((day) => ({
    ...day,
    salesAmount: null,
    orderCount: 0,
    weather: null,
  }))
  data.selectedDay = {
    ...data.selectedDay,
    salesAmount: null,
    orderCount: 0,
    insight: {
      salesLevel: 'UNAVAILABLE',
      monthlyAverageSalesAmount: null,
      deviationRate: null,
    },
  }
  getSalesCalendar.mockResolvedValue(data)
  mount()
  expect(
    await screen.findByText('선택한 월에 매출 데이터가 없습니다.'),
  ).toBeInTheDocument()
  expect(screen.queryByText('0건')).not.toBeInTheDocument()
  expect(screen.getByText('월평균 데이터 없음')).toBeInTheDocument()
})

test('조회 실패 후 사용자 재시도로 복구한다', async () => {
  getSalesCalendar
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValue(response())
  mount()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    '달력 데이터를 불러오지 못했습니다.',
  )
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  expect(await screen.findByLabelText('월간 매출 달력')).toBeInTheDocument()
  expect(getSalesCalendar).toHaveBeenCalledTimes(2)
})

test('로딩 중에는 진행 안내를 표시한다', () => {
  getSalesCalendar.mockReturnValue(new Promise(() => {}))
  mount()
  expect(screen.getByRole('status')).toHaveTextContent(
    '매출 달력을 불러오는 중입니다.',
  )
})

test('세션 만료 시 로그인 화면으로 이동한다', async () => {
  getSalesCalendar.mockRejectedValue({
    isAxiosError: true,
    response: { status: 401 },
  })
  mount()
  expect(await screen.findByText('로그인 화면')).toBeInTheDocument()
  expect(getSalesCalendar).toHaveBeenCalledTimes(1)
})
