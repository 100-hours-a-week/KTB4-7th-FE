import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SalesAnalysisPage } from './SalesAnalysisPage'

const {
  getSalesAnalysis,
  getSalesAvailableMonths,
  getSalesAnalysisMonthOptions,
  getProfitAnalysis,
  getSalesExpectedForecast,
  getNotifications,
  navigate,
} = vi.hoisted(() => ({
  getSalesAnalysis: vi.fn(),
  getSalesAvailableMonths: vi.fn(),
  getSalesAnalysisMonthOptions: vi.fn(),
  getProfitAnalysis: vi.fn(),
  getSalesExpectedForecast: vi.fn(),
  getNotifications: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/sales/api/salesApi', () => ({
  getSalesAnalysis,
  getSalesAvailableMonths,
  getSalesAnalysisMonthOptions,
  getProfitAnalysis,
  getSalesExpectedForecast,
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
      type: 'CUSTOM' as const,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    },
    comparisonPeriod: { startDate: '2026-08-01', endDate: '2026-08-31' },
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
    forecast: {
      predictedSalesAmount: 1080000,
      lowerBound: 930000,
      upperBound: 1230000,
      dailyForecasts: [
        {
          targetDate: '2026-09-29',
          predictedSalesAmount: 540000,
          lowerBound: 465000,
          upperBound: 615000,
        },
        {
          targetDate: '2026-09-30',
          predictedSalesAmount: 540000,
          lowerBound: 465000,
          upperBound: 615000,
        },
      ],
    },
    aiInsight: {
      targetMonth: '2026-09',
      status: 'COMPLETED' as const,
      insights: ['최근 화요일 매출이 3주 연속 감소하고 있어요.'],
      helperText: null,
      generatedAt: '2026-09-27T00:00:00+09:00',
    },
  },
}

beforeEach(() => {
  getSalesAnalysis.mockReset()
  getSalesAvailableMonths.mockReset()
  getSalesAnalysisMonthOptions.mockReset()
  getProfitAnalysis.mockReset()
  getSalesExpectedForecast.mockReset()
  getNotifications.mockReset()
  navigate.mockReset()
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })
  getSalesExpectedForecast.mockResolvedValue({
    status: 'EMPTY',
    message: '예측 매출 데이터가 없습니다.',
    data: null,
  })
  getSalesAnalysisMonthOptions.mockImplementation(async () => {
    const result = await getSalesAvailableMonths()
    return { months: result.months.map((targetMonth: string, index: number) => ({
      targetMonth,
      uploadId: index + 1,
      fileName: `${targetMonth}.xlsx`,
      uploadedAt: '2026-10-01T12:00:00+09:00',
    })) }
  })
})

test('가장 최근 달을 기본으로 조회해 통계와 AI 인사이트를 표시한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({
    months: ['2026-07', '2026-08', '2026-09'],
  })
  getSalesAnalysis.mockResolvedValue(completedResponse)
  getSalesExpectedForecast.mockResolvedValue({
    status: 'COMPLETED',
    message: '예상 매출을 조회했습니다.',
    data: {
      targetMonth: '2026-10',
      actualSalesAmount: 0,
      forecastSalesAmount: 1080000,
      expectedSalesAmount: 1080000,
      lowerBound: 930000,
      upperBound: 1230000,
      dailyForecasts: [],
    },
  })

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  expect(await screen.findByText('₩7,920,000')).toBeInTheDocument()
  expect(screen.getByRole('option', { name: '2026년 9월 · 2026-09.xlsx' })).toBeInTheDocument()
  expect(screen.getByText('2026년 10월 예상 총매출')).toBeInTheDocument()
  expect(screen.getByText('₩1,080,000')).toBeInTheDocument()
  expect(
    screen.getByText('예상 범위 ₩930,000 - ₩1,230,000'),
  ).toBeInTheDocument()
  expect(screen.queryByText(/누적 매출/)).not.toBeInTheDocument()
  expect(screen.getByText('923건')).toBeInTheDocument()
  expect(screen.getByText('₩8,582')).toBeInTheDocument()
  expect(screen.getByText('▲ 4.2%')).toHaveClass('trend-up')
  expect(screen.getByText('▼ 0.8%')).toHaveClass('trend-down')
  expect(
    screen.getByText('최근 화요일 매출이 3주 연속 감소하고 있어요.'),
  ).toBeInTheDocument()
  expect(getSalesAnalysis).toHaveBeenCalledWith({
    periodType: 'CUSTOM',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  })
  expect(screen.getByLabelText('조회할 월')).toHaveValue('2026-09')
})

test('최신 업로드 월의 예측 데이터가 없으면 예상 총매출을 자동으로 다시 조회한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
  getSalesAnalysis.mockResolvedValue(completedResponse)
  getSalesExpectedForecast
    .mockResolvedValueOnce({ status: 'EMPTY', message: '없음', data: null })
    .mockResolvedValueOnce({
      status: 'COMPLETED',
      message: '조회 성공',
      data: {
        targetMonth: '2026-10',
        actualSalesAmount: 0,
        forecastSalesAmount: 1080000,
        expectedSalesAmount: 1080000,
        lowerBound: 930000,
        upperBound: 1230000,
        dailyForecasts: [],
      },
    })

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  await screen.findByText('₩7,920,000')
  expect(
    screen.queryByLabelText('2026년 10월 예상 총매출'),
  ).not.toBeInTheDocument()
  expect(
    await screen.findByText('예상 총매출을 확인하고 있어요.'),
  ).toBeInTheDocument()

  expect(
    await screen.findByText('2026년 10월 예상 총매출', {}, { timeout: 4000 }),
  ).toBeInTheDocument()
  expect(screen.getByText('₩1,080,000')).toBeInTheDocument()
})

test('업로드 직후에는 기존 예측값이 바뀌면 재조회를 멈춘다', async () => {
  vi.useFakeTimers()
  try {
    getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
    getSalesAnalysis.mockResolvedValue(completedResponse)
    const oldForecast = {
      targetMonth: '2026-10',
      actualSalesAmount: 0,
      forecastSalesAmount: 1080000,
      expectedSalesAmount: 1080000,
      lowerBound: 930000,
      upperBound: 1230000,
      dailyForecasts: [],
    }
    const newForecast = {
      ...oldForecast,
      forecastSalesAmount: 1200000,
      expectedSalesAmount: 1200000,
    }
    getSalesExpectedForecast
      .mockResolvedValueOnce({
        status: 'COMPLETED',
        message: '조회 성공',
        data: oldForecast,
      })
      .mockResolvedValueOnce({
        status: 'COMPLETED',
        message: '조회 성공',
        data: oldForecast,
      })
      .mockResolvedValue({
        status: 'COMPLETED',
        message: '조회 성공',
        data: newForecast,
      })

    const view = render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/sales/analysis',
            state: { refreshForecastAfterUpload: true },
          },
        ]}
      >
        <SalesAnalysisPage />
      </MemoryRouter>,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(getSalesExpectedForecast).toHaveBeenCalledTimes(1)
    expect(screen.getByText('₩1,080,000')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(getSalesExpectedForecast).toHaveBeenCalledTimes(2)
    expect(screen.getByText('₩1,080,000')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(screen.getByText('₩1,200,000')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000)
    })
    expect(getSalesExpectedForecast).toHaveBeenCalledTimes(3)
    view.unmount()
  } finally {
    vi.useRealTimers()
  }
})

test('업로드 직후 예측이 비어 있으면 첫 완료 응답에서 재조회를 멈춘다', async () => {
  vi.useFakeTimers()
  try {
    getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
    getSalesAnalysis.mockResolvedValue(completedResponse)
    getSalesExpectedForecast
      .mockResolvedValueOnce({ status: 'EMPTY', message: '없음', data: null })
      .mockResolvedValue({
        status: 'COMPLETED',
        message: '조회 성공',
        data: {
          targetMonth: '2026-10',
          actualSalesAmount: 0,
          forecastSalesAmount: 1200000,
          expectedSalesAmount: 1200000,
          lowerBound: 930000,
          upperBound: 1230000,
          dailyForecasts: [],
        },
      })

    const view = render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/sales/analysis',
            state: { refreshForecastAfterUpload: true },
          },
        ]}
      >
        <SalesAnalysisPage />
      </MemoryRouter>,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(screen.getByText('₩1,200,000')).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000)
    })
    expect(getSalesExpectedForecast).toHaveBeenCalledTimes(2)
    view.unmount()
  } finally {
    vi.useRealTimers()
  }
})

test('업로드 후 예측값이 그대로면 60초 후 재조회를 멈춘다', async () => {
  vi.useFakeTimers()
  try {
    getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
    getSalesAnalysis.mockResolvedValue(completedResponse)
    getSalesExpectedForecast.mockResolvedValue({
      status: 'COMPLETED',
      message: '조회 성공',
      data: {
        targetMonth: '2026-10',
        actualSalesAmount: 0,
        forecastSalesAmount: 1080000,
        expectedSalesAmount: 1080000,
        lowerBound: 930000,
        upperBound: 1230000,
        dailyForecasts: [],
      },
    })

    const view = render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/sales/analysis',
            state: { refreshForecastAfterUpload: true },
          },
        ]}
      >
        <SalesAnalysisPage />
      </MemoryRouter>,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(63000)
    })
    expect(screen.getByText('₩1,080,000')).toBeInTheDocument()
    expect(getSalesExpectedForecast).toHaveBeenCalledTimes(21)
    view.unmount()
  } finally {
    vi.useRealTimers()
  }
})

test('예측 데이터가 계속 없으면 재조회를 멈추고 다시 확인 버튼을 표시한다', async () => {
  vi.useFakeTimers()
  try {
    getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
    getSalesAnalysis.mockResolvedValue(completedResponse)
    const view = render(
      <MemoryRouter>
        <SalesAnalysisPage />
      </MemoryRouter>,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000)
    })

    expect(
      screen.getByText('아직 예상 총매출을 불러오지 못했어요.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '다시 확인' }),
    ).toBeInTheDocument()
    expect(getSalesExpectedForecast).toHaveBeenCalledTimes(21)
    view.unmount()
  } finally {
    vi.useRealTimers()
  }
})

test('예상 총매출 조회 오류 후 다시 확인을 누르면 재조회한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
  getSalesAnalysis.mockResolvedValue(completedResponse)
  getSalesExpectedForecast
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce({
      status: 'COMPLETED',
      message: '조회 성공',
      data: {
        targetMonth: '2026-10',
        actualSalesAmount: 0,
        forecastSalesAmount: 1080000,
        expectedSalesAmount: 1080000,
        lowerBound: 930000,
        upperBound: 1230000,
        dailyForecasts: [],
      },
    })

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  fireEvent.click(await screen.findByRole('button', { name: '다시 확인' }))
  expect(await screen.findByText('₩1,080,000')).toBeInTheDocument()
})

test('지난 월로 이동하면 예정된 예상 총매출 재조회를 취소한다', async () => {
  vi.useFakeTimers()
  try {
    getSalesAvailableMonths.mockResolvedValue({
      months: ['2026-08', '2026-09'],
    })
    getSalesAnalysis.mockResolvedValue(completedResponse)
    const view = render(
      <MemoryRouter>
        <SalesAnalysisPage />
      </MemoryRouter>,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(getSalesExpectedForecast).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByLabelText('조회할 월'), {
      target: { value: '2026-08' },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(getSalesExpectedForecast).toHaveBeenCalledTimes(1)
    view.unmount()
  } finally {
    vi.useRealTimers()
  }
})

test('지난 월을 선택하면 예상 총매출 카드를 숨긴다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-08', '2026-09'] })
  getSalesAnalysis.mockResolvedValue(completedResponse)
  getSalesExpectedForecast.mockResolvedValue({
    status: 'COMPLETED',
    message: '예상 매출을 조회했습니다.',
    data: {
      targetMonth: '2026-10',
      actualSalesAmount: 0,
      forecastSalesAmount: 1080000,
      expectedSalesAmount: 1080000,
      lowerBound: 930000,
      upperBound: 1230000,
      dailyForecasts: [],
    },
  })

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  expect(await screen.findByText('2026년 10월 예상 총매출')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('조회할 월'), {
    target: { value: '2026-08' },
  })

  await waitFor(() => {
    expect(
      screen.queryByText('2026년 10월 예상 총매출'),
    ).not.toBeInTheDocument()
  })
})

test('진행 중인 월에는 누적 매출과 남은 기간 예측을 함께 표시한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
  getSalesAnalysis.mockResolvedValue(completedResponse)
  getSalesExpectedForecast.mockResolvedValue({
    status: 'COMPLETED',
    message: '예상 매출을 조회했습니다.',
    data: {
      targetMonth: '2026-09',
      actualSalesAmount: 7920000,
      forecastSalesAmount: 1080000,
      expectedSalesAmount: 9000000,
      lowerBound: 8850000,
      upperBound: 9150000,
      dailyForecasts: [],
    },
  })

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  const forecastCard = await screen.findByLabelText('2026년 9월 예상 총매출')
  expect(within(forecastCard).getByText('누적 매출')).toBeInTheDocument()
  expect(within(forecastCard).getByText('₩7,920,000')).toBeInTheDocument()
  expect(within(forecastCard).getByText('남은 기간 예측')).toBeInTheDocument()
  expect(within(forecastCard).getByText('₩1,080,000')).toBeInTheDocument()
  expect(screen.queryByText(/예상 범위/)).not.toBeInTheDocument()
})

test('연속 매출 데이터가 14일 미만이면 AI 인사이트 안내 문구를 표시한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
  getSalesAnalysis.mockResolvedValue({
    ...completedResponse,
    data: {
      ...completedResponse.data,
      aiInsight: {
        targetMonth: '2026-09',
        status: 'INSUFFICIENT_DATA',
        insights: [],
        helperText:
          'AI 인사이트를 확인하려면 최소 2주(14일) 이상의 매출 데이터가 필요합니다.',
        generatedAt: null,
      },
    },
  })

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  expect(await screen.findByText('₩7,920,000')).toBeInTheDocument()
  expect(
    screen.getByText(
      'AI 인사이트를 확인하려면 최소 2주(14일) 이상의 매출 데이터가 필요합니다.',
    ),
  ).toBeInTheDocument()
  expect(screen.queryByText('AI가 발견했어요')).not.toBeInTheDocument()
})

test('AI 인사이트 생성 실패 안내와 기본 매출 정보를 함께 표시한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
  getSalesAnalysis.mockResolvedValue({
    ...completedResponse,
    data: {
      ...completedResponse.data,
      aiInsight: {
        targetMonth: '2026-09',
        status: 'FAILED',
        insights: [],
        helperText:
          'AI 인사이트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
        generatedAt: null,
      },
    },
  })

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  expect(await screen.findByText('₩7,920,000')).toBeInTheDocument()
  expect(
    screen.getByText(
      'AI 인사이트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
    ),
  ).toBeInTheDocument()
})

test('월 선택을 바꾸면 해당 월 기간으로 다시 조회한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({
    months: ['2026-08', '2026-09'],
  })
  getSalesAnalysis.mockResolvedValue(completedResponse)

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  await screen.findByText('₩7,920,000')

  fireEvent.change(screen.getByLabelText('조회할 월'), {
    target: { value: '2026-08' },
  })

  await waitFor(() =>
    expect(getSalesAnalysis).toHaveBeenLastCalledWith({
      periodType: 'CUSTOM',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    }),
  )
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
  expect(
    screen.getByRole('link', { name: '매출 데이터 업로드' }),
  ).toHaveAttribute('href', '/sales/upload')
  expect(getSalesAnalysis).not.toHaveBeenCalled()
})

test('세션이 없으면 로그인 페이지로 이동한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
  getSalesAnalysis.mockRejectedValue({ response: { status: 401 } })

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'))
})

test('화살표를 누르면 다른 분석 그래프로 이동한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
  getSalesAnalysis.mockResolvedValue(completedResponse)

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  await screen.findByText('₩7,920,000')

  expect(
    screen.getByRole('heading', { level: 3, name: '시간대별 매출' }),
  ).toBeInTheDocument()
  expect(screen.getByLabelText('이전 그래프 보기')).toBeDisabled()

  const nextButton = screen.getByLabelText('다음 그래프 보기')
  fireEvent.click(nextButton)
  expect(
    screen.getByRole('heading', { level: 3, name: '일별 매출 추이' }),
  ).toBeInTheDocument()

  fireEvent.click(nextButton)
  expect(
    screen.getByRole('heading', { level: 3, name: '요일별 매출' }),
  ).toBeInTheDocument()

  fireEvent.click(nextButton)
  expect(
    screen.getByRole('heading', { level: 3, name: '메뉴별 매출 순위' }),
  ).toBeInTheDocument()
  expect(nextButton).toBeDisabled()

  fireEvent.click(screen.getByLabelText('이전 그래프 보기'))
  expect(
    screen.getByRole('heading', { level: 3, name: '요일별 매출' }),
  ).toBeInTheDocument()
})

test('스와이프 동작으로도 그래프를 넘길 수 있다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
  getSalesAnalysis.mockResolvedValue(completedResponse)

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  await screen.findByText('₩7,920,000')

  const carousel = screen
    .getByRole('heading', {
      level: 3,
      name: '시간대별 매출',
    })
    .closest('.chart-carousel') as HTMLElement
  expect(carousel).not.toBeNull()

  fireEvent.touchStart(carousel, { touches: [{ clientX: 200 }] })
  fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 100 }] })

  expect(
    screen.getByRole('heading', { level: 3, name: '일별 매출 추이' }),
  ).toBeInTheDocument()
})

test('메뉴별 매출 순위는 매출 0원을 숨기고 10개씩 페이지네이션한다', async () => {
  const menuRankings = [
    ...Array.from({ length: 11 }, (_, index) => ({
      rank: index + 1,
      menuName: `메뉴${index + 1}`,
      salesAmount: 100000 - index * 1000,
      quantity: 10,
    })),
    { rank: 12, menuName: '품절된메뉴', salesAmount: 0, quantity: 0 },
    { rank: 13, menuName: '중단된메뉴', salesAmount: 0, quantity: 0 },
  ]

  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
  getSalesAnalysis.mockResolvedValue({
    ...completedResponse,
    data: { ...completedResponse.data, menuRankings },
  })

  render(
    <MemoryRouter>
      <SalesAnalysisPage />
    </MemoryRouter>,
  )

  await screen.findByText('₩7,920,000')

  const nextButton = screen.getByLabelText('다음 그래프 보기')
  fireEvent.click(nextButton)
  fireEvent.click(nextButton)
  fireEvent.click(nextButton)
  await screen.findByRole('heading', { level: 3, name: '메뉴별 매출 순위' })

  expect(screen.getByText('메뉴1')).toBeInTheDocument()
  expect(screen.getByText('메뉴10')).toBeInTheDocument()
  expect(screen.queryByText('메뉴11')).not.toBeInTheDocument()
  expect(screen.queryByText('품절된메뉴')).not.toBeInTheDocument()
  expect(screen.queryByText('중단된메뉴')).not.toBeInTheDocument()
  expect(screen.getByText('1 / 2')).toBeInTheDocument()

  const menuNextButton = screen
    .getByText('1 / 2')
    .closest('.menu-pagination')!
    .querySelector('button:last-child') as HTMLElement
  fireEvent.click(menuNextButton)

  expect(screen.getByText('메뉴11')).toBeInTheDocument()
  expect(screen.queryByText('메뉴10')).not.toBeInTheDocument()
  expect(screen.getByText('2 / 2')).toBeInTheDocument()
  expect(menuNextButton).toBeDisabled()
})

test('월을 유지하며 매출 분석과 순이익 분석을 전환한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-08', '2026-09'] })
  getSalesAnalysis.mockResolvedValue(completedResponse)
  getProfitAnalysis.mockResolvedValue({
    status: 'COMPLETED', message: '조회에 성공했습니다.',
    data: {
      summary: {
        totalNetAmount: 1000, ingredientCost: 400, fixedCost: 100, totalCost: 500,
        netProfit: 500, netProfitRate: 0.5, previousNetProfit: 400,
        netProfitChangeRate: 0.25, previousTotalCost: 400,
        totalCostChangeRate: 0.25, previousNetProfitRate: 0.4,
        netProfitRateDifference: 0.1,
      },
      dailyProfits: [{ date: '2026-08-01', netProfit: 500 }],
      weekdayProfits: [{ dayOfWeek: 'SATURDAY', netProfit: 500 }],
      aiInsight: { status: 'COMPLETED', insights: ['순이익이 증가했어요.'] },
    },
  })

  render(<MemoryRouter><SalesAnalysisPage /></MemoryRouter>)
  await screen.findByText('₩7,920,000')
  fireEvent.change(screen.getByLabelText('조회할 월'), { target: { value: '2026-08' } })
  fireEvent.click(screen.getByRole('button', { name: '순이익 분석' }))

  expect(await screen.findByText('순이익이 증가했어요.')).toBeInTheDocument()
  expect(screen.getAllByText('500원', { selector: '.stat-card strong' })).toHaveLength(2)
  expect(screen.getByText('50.0%')).toBeInTheDocument()
  expect(screen.getByText('이전 달 대비 +10.0%p')).toBeInTheDocument()
  expect(screen.getByLabelText('조회할 월')).toHaveValue('2026-08')
  expect(getProfitAnalysis).toHaveBeenCalledWith('2026-08-01', '2026-08-31')
  fireEvent.click(screen.getByRole('button', { name: '매출 분석' }))
  expect(screen.getByLabelText('조회할 월')).toHaveValue('2026-08')
})

test('순이익 비용이 누락되면 해당 파일의 입력 화면으로 안내한다', async () => {
  getSalesAvailableMonths.mockResolvedValue({ months: ['2026-09'] })
  getSalesAnalysis.mockResolvedValue(completedResponse)
  getProfitAnalysis.mockResolvedValue({
    status: 'COST_INPUT_REQUIRED', message: '순수익 분석 정보를 입력해주세요.',
    data: { missingCostMonths: ['2026-09'] },
  })

  render(<MemoryRouter><SalesAnalysisPage /></MemoryRouter>)
  await screen.findByText('₩7,920,000')
  fireEvent.click(screen.getByRole('button', { name: '순이익 분석' }))

  expect(await screen.findByText('2026-09 비용을 확인하고 저장해주세요.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '비용 입력하기' }))
    .toHaveAttribute('href', '/sales/uploads/1/cost-items')
})
