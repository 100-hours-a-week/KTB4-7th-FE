import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SolutionPage, SolutionPreviewPage } from './SolutionPage'

const { getTodaySolution, retryTodaySolution } = vi.hoisted(() => ({
  getTodaySolution: vi.fn(),
  retryTodaySolution: vi.fn(),
}))

vi.mock('../features/solution/api/solutionApi', () => ({
  getTodaySolution,
  retryTodaySolution,
}))

beforeEach(() => {
  getTodaySolution.mockReset()
  retryTodaySolution.mockReset()
})

test('오늘의 솔루션 카드 3개를 보여주고 상세 페이지로 연결한다', async () => {
  getTodaySolution.mockResolvedValue({
    message: '조회에 성공했습니다.',
    status: 'COMPLETED',
    data: {
      storeName: '맴매 베이커리',
      screenTitle: '맴매 베이커리 맴매 솔루션',
      solutionBundleId: 12,
      targetDate: '2026-09-27',
      solutionCards: [
        {
          id: 1,
          rankNo: 1,
          title: '재고 점검',
          summaryText: '요약1',
          detailText: '상세1',
          evidence: '근거1',
          isSaved: false,
          savedId: null,
        },
        {
          id: 2,
          rankNo: 2,
          title: '재방문 혜택',
          summaryText: '요약2',
          detailText: '상세2',
          evidence: '근거2',
          isSaved: false,
          savedId: null,
        },
        {
          id: 3,
          rankNo: 3,
          title: '메뉴 구성',
          summaryText: '요약3',
          detailText: '상세3',
          evidence: '근거3',
          isSaved: false,
          savedId: null,
        },
      ],
    },
  })

  render(
    <MemoryRouter>
      <SolutionPage />
    </MemoryRouter>,
  )

  expect(
    await screen.findByRole('link', { name: /재고 점검/ }),
  ).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /재방문 혜택/ })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /메뉴 구성/ })).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: '오늘의 솔루션' }),
  ).toBeInTheDocument()
  expect(screen.getByText('3가지 제안')).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /요약[123]/ })).toHaveLength(3)
  expect(screen.getByRole('link', { name: /재고 점검/ })).toHaveAttribute(
    'href',
    '/solution/12/1',
  )
  expect(screen.getByRole('link', { name: /재방문 혜택/ })).toHaveAttribute(
    'href',
    '/solution/12/2',
  )
  expect(screen.getByRole('link', { name: 'AI에게 질문하기' })).toHaveAttribute(
    'href',
    '/solution/chat',
  )
})

test('페이지 표시로 솔루션을 선택하고 스크롤 위치를 반영한다', () => {
  render(
    <MemoryRouter>
      <SolutionPreviewPage />
    </MemoryRouter>,
  )

  const carousel = screen.getByLabelText('오늘의 솔루션 카드')
  Array.from(carousel.children).forEach((card, index) => {
    Object.defineProperty(card, 'offsetLeft', { value: index * 300 })
  })
  Object.defineProperty(carousel, 'scrollTo', {
    value: ({ left }: { left: number }) => {
      carousel.scrollLeft = left
      fireEvent.scroll(carousel)
    },
  })
  carousel.scrollLeft = 900
  fireEvent.scroll(carousel)

  expect(
    screen.queryByRole('button', { name: '다음 솔루션' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: '이전 솔루션' }),
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '2번 솔루션 보기' }))
  expect(carousel.scrollLeft).toBe(1200)
  expect(
    screen.getByRole('button', { name: '2번 솔루션 보기' }),
  ).toHaveAttribute('aria-current', 'true')
  carousel.scrollLeft = 1500
  fireEvent.scroll(carousel)
  expect(
    screen.getByRole('button', { name: '3번 솔루션 보기' }),
  ).toHaveAttribute('aria-current', 'true')
})

test('데이터 기간이 1년 미만이면 솔루션 정확도 안내를 보여준다', async () => {
  getTodaySolution.mockResolvedValue({
    message: '조회에 성공했습니다.',
    status: 'COMPLETED',
    data: {
      storeName: '맴매 베이커리',
      screenTitle: '맴매 베이커리 맴매 솔루션',
      solutionBundleId: 12,
      targetDate: '2026-09-27',
      solutionCards: [
        {
          id: 1,
          rankNo: 1,
          title: '재고 점검',
          summaryText: '요약1',
          detailText: '상세1',
          evidence: '근거1',
          isSaved: false,
          savedId: null,
        },
      ],
      helperText:
        '데이터가 충분하지 않아 솔루션의 정확도가 낮을 수 있어요. 데이터가 쌓일수록 더 정확한 분석을 제공할 수 있어요.',
    },
  })

  render(
    <MemoryRouter>
      <SolutionPage />
    </MemoryRouter>,
  )

  expect(
    await screen.findByText(
      '데이터가 충분하지 않아 솔루션의 정확도가 낮을 수 있어요. 데이터가 쌓일수록 더 정확한 분석을 제공할 수 있어요.',
    ),
  ).toBeInTheDocument()
})

test('3개월 미만이면 솔루션 생성 전 안내 문구를 보여준다', async () => {
  getTodaySolution.mockResolvedValue({
    message: '솔루션 생성을 위해 최소 3개월 이상의 데이터가 필요합니다.',
    status: 'INSUFFICIENT_HISTORY',
    data: {
      storeName: null,
      screenTitle: null,
      solutionBundleId: null,
      targetDate: '2026-09-27',
      solutionCards: [],
      helperText: '솔루션 생성을 위해 최소 3개월 이상의 데이터가 필요합니다.',
    },
  })

  render(
    <MemoryRouter>
      <SolutionPage />
    </MemoryRouter>,
  )

  expect(
    await screen.findByText(
      '솔루션 생성을 위해 최소 3개월 이상의 데이터가 필요합니다.',
    ),
  ).toBeInTheDocument()
})

test('기존 자정 응답을 받아도 준비 중 안내를 보여주고 업로드를 유도하지 않는다', async () => {
  getTodaySolution.mockResolvedValue({
    message: '오늘의 솔루션은 매일 자정에 준비됩니다.',
    status: 'EMPTY',
    data: {
      storeName: null,
      screenTitle: null,
      solutionBundleId: null,
      targetDate: '2026-09-30',
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
      name: '오늘의 솔루션을 준비하고 있어요',
    }),
  ).toBeInTheDocument()
  expect(screen.queryByText(/자정/)).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: '매출 데이터 업로드' }),
  ).not.toBeInTheDocument()
})

test('예측 범위 밖이면 최근 매출 업로드를 안내한다', async () => {
  getTodaySolution.mockResolvedValue({
    message: '2026년 8월 27일 이후 매출이 포함된 파일을 업로드해 주세요.',
    status: 'FORECAST_OUT_OF_RANGE',
    data: {
      storeName: null,
      screenTitle: null,
      solutionBundleId: null,
      targetDate: '2026-10-01',
      solutionCards: [],
      helperText: '솔루션 생성에는 연속 3개월 이상의 매출 이력도 필요합니다.',
    },
  })

  render(
    <MemoryRouter>
      <SolutionPage />
    </MemoryRouter>,
  )

  expect(
    await screen.findByRole('heading', {
      name: '최근 매출 데이터가 필요합니다',
    }),
  ).toBeInTheDocument()
  expect(
    screen.getByText(
      '2026년 8월 27일 이후 매출이 포함된 파일을 업로드해 주세요.',
    ),
  ).toBeInTheDocument()
  expect(
    screen.getByText(
      '솔루션 생성에는 연속 3개월 이상의 매출 이력도 필요합니다.',
    ),
  ).toBeInTheDocument()
  expect(screen.getByRole('main')).toHaveClass('solution-empty-content')
  expect(
    screen.getByRole('link', { name: '매출 데이터 업로드' }),
  ).toHaveAttribute('href', '/sales/upload')
  expect(
    screen.queryByText('오늘의 솔루션은 자정에 준비됩니다'),
  ).not.toBeInTheDocument()
})

test('준비 중 EMPTY 응답은 진행 모달을 유지하고 3초마다 재조회한다', async () => {
  vi.useFakeTimers()
  try {
    getTodaySolution
      .mockResolvedValueOnce({
        message: '오늘의 솔루션을 준비하고 있습니다.',
        status: 'EMPTY',
        data: {
          storeName: null,
          screenTitle: null,
          solutionBundleId: null,
          targetDate: '2026-10-01',
          solutionCards: [],
        },
      })
      .mockResolvedValueOnce({
        message: '조회에 성공했습니다.',
        status: 'COMPLETED',
        data: {
          storeName: '맴매 베이커리',
          screenTitle: '맴매 베이커리 오늘의 솔루션',
          solutionBundleId: 82,
          targetDate: '2026-10-01',
          solutionCards: [
            {
              id: 1,
              rankNo: 1,
              title: '재고 점검',
              summaryText: '재고를 확인해 보세요.',
              detailText: '상세 내용',
              evidence: '근거',
              isSaved: false,
              savedId: null,
            },
          ],
        },
      })

    render(
      <MemoryRouter>
        <SolutionPage />
      </MemoryRouter>,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(
      screen.getByRole('dialog', {
        name: '오늘의 솔루션을 준비하고 있어요',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('자동으로 확인하고 있어요')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveClass('solution-empty-content')
    expect(screen.queryByText(/자정/)).not.toBeInTheDocument()
    expect(getTodaySolution).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(getTodaySolution).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('link', { name: /재고 점검/ })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  } finally {
    vi.useRealTimers()
  }
})

test('솔루션 생성 중 상태를 모달로 보여준다', async () => {
  getTodaySolution.mockResolvedValue({
    message: '매출 데이터를 분석하고 있습니다.',
    status: 'GENERATING',
    data: {
      storeName: '맴매 베이커리',
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
    await screen.findByRole('dialog', {
      name: '오늘의 솔루션을 생성하고 있어요',
    }),
  ).toBeInTheDocument()
  expect(screen.getByText('자동으로 확인하고 있어요')).toBeInTheDocument()
})

test('솔루션 생성 실패 상태를 모달로 보여준다', async () => {
  getTodaySolution.mockResolvedValue({
    message: '생성 요청을 완료하지 못했습니다.',
    status: 'FAILED',
    data: {
      storeName: '맴매 베이커리',
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
    await screen.findByRole('dialog', {
      name: '솔루션 생성에 실패했어요',
    }),
  ).toBeInTheDocument()
  expect(screen.getByText('ISSUE REPORT / 01')).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: '다시 확인하기' }),
  ).toBeInTheDocument()
})

test('실패 화면에서 재시도 중 중복 클릭을 막고 완료 후 다시 조회한다', async () => {
  let resolveRetry: ((value: unknown) => void) | undefined
  getTodaySolution
    .mockResolvedValueOnce({
      message: '생성 요청을 완료하지 못했습니다.',
      status: 'FAILED',
      data: {
        storeName: '맴매 베이커리',
        screenTitle: null,
        solutionBundleId: null,
        targetDate: '2026-09-27',
        solutionCards: [],
      },
    })
    .mockResolvedValueOnce({
      message: '조회에 성공했습니다.',
      status: 'COMPLETED',
      data: {
        storeName: '맴매 베이커리',
        screenTitle: null,
        solutionBundleId: 81,
        targetDate: '2026-09-27',
        solutionCards: [
          {
            id: 1,
            rankNo: 1,
            title: '재고 점검',
            summaryText: '요약',
            detailText: '상세',
            evidence: '근거',
            isSaved: false,
            savedId: null,
          },
        ],
      },
    })
  retryTodaySolution.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRetry = resolve
      }),
  )

  render(
    <MemoryRouter>
      <SolutionPage />
    </MemoryRouter>,
  )

  fireEvent.click(await screen.findByRole('button', { name: '다시 확인하기' }))

  expect(
    await screen.findByRole('button', { name: '확인 중...' }),
  ).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '확인 중...' }))
  expect(retryTodaySolution).toHaveBeenCalledTimes(1)
  expect(getTodaySolution).toHaveBeenCalledTimes(1)

  await act(async () => {
    resolveRetry?.({
      message: '솔루션 재시도가 완료되었습니다.',
      status: 'COMPLETED',
      data: { solutionBundleId: 81 },
    })
  })
  await waitFor(() => expect(getTodaySolution).toHaveBeenCalledTimes(2))
  expect(await screen.findByText('재고 점검')).toBeInTheDocument()
})

test('이미 생성 중이면 GET으로 동기화하고 재시도 POST를 반복하지 않는다', async () => {
  getTodaySolution
    .mockResolvedValueOnce({
      message: '생성 실패',
      status: 'FAILED',
      data: {
        storeName: '맴매 베이커리',
        screenTitle: null,
        solutionBundleId: 81,
        targetDate: '2026-09-27',
        solutionCards: [],
      },
    })
    .mockResolvedValueOnce({
      message: '생성 중',
      status: 'GENERATING',
      data: {
        storeName: '맴매 베이커리',
        screenTitle: null,
        solutionBundleId: 81,
        targetDate: '2026-09-27',
        solutionCards: [],
      },
    })
  retryTodaySolution.mockRejectedValueOnce({
    response: {
      status: 409,
      data: {
        message: '이미 생성하고 있습니다.',
        status: 'IN_PROGRESS',
        data: { solutionBundleId: 81 },
      },
    },
  })
  render(
    <MemoryRouter>
      <SolutionPage />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '다시 확인하기' }))
  expect(
    await screen.findByText('자동으로 확인하고 있어요'),
  ).toBeInTheDocument()
  expect(getTodaySolution).toHaveBeenCalledTimes(2)
  expect(retryTodaySolution).toHaveBeenCalledTimes(1)
})

test('데이터 미준비 응답은 안내하고 재조회나 자동 재시도하지 않는다', async () => {
  getTodaySolution.mockResolvedValue({
    message: '생성 실패',
    status: 'FAILED',
    data: {
      storeName: '맴매 베이커리',
      screenTitle: null,
      solutionBundleId: 81,
      targetDate: '2026-09-27',
      solutionCards: [],
    },
  })
  retryTodaySolution.mockRejectedValueOnce({
    response: {
      status: 422,
      data: {
        message: '솔루션 생성에 필요한 데이터가 준비되지 않았습니다.',
        status: 'DATA_NOT_READY',
        data: null,
      },
    },
  })
  render(
    <MemoryRouter>
      <SolutionPage />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '다시 확인하기' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    '솔루션 생성에 필요한 데이터가 준비되지 않았습니다.',
  )
  expect(getTodaySolution).toHaveBeenCalledTimes(1)
  expect(retryTodaySolution).toHaveBeenCalledTimes(1)
})

test('재시도 불가 응답은 GET으로 현재 상태를 다시 동기화한다', async () => {
  getTodaySolution
    .mockResolvedValueOnce({
      message: '생성 실패',
      status: 'FAILED',
      data: {
        storeName: '맴매 베이커리',
        screenTitle: null,
        solutionBundleId: 81,
        targetDate: '2026-09-27',
        solutionCards: [],
      },
    })
    .mockResolvedValueOnce({
      message: '조회에 성공했습니다.',
      status: 'EMPTY',
      data: {
        storeName: '맴매 베이커리',
        screenTitle: null,
        solutionBundleId: null,
        targetDate: '2026-09-27',
        solutionCards: [],
      },
    })
  retryTodaySolution.mockRejectedValueOnce({
    response: {
      status: 409,
      data: {
        message: '오늘 실패한 솔루션만 다시 생성할 수 있습니다.',
        status: 'NOT_ALLOWED',
        data: null,
      },
    },
  })
  render(
    <MemoryRouter>
      <SolutionPage />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '다시 확인하기' }))
  await waitFor(() => expect(getTodaySolution).toHaveBeenCalledTimes(2))
  expect(retryTodaySolution).toHaveBeenCalledTimes(1)
})

test('재생성 실패 응답은 안내하고 임의로 다시 호출하지 않는다', async () => {
  getTodaySolution.mockResolvedValue({
    message: '생성 실패',
    status: 'FAILED',
    data: {
      storeName: '맴매 베이커리',
      screenTitle: null,
      solutionBundleId: 81,
      targetDate: '2026-09-27',
      solutionCards: [],
    },
  })
  retryTodaySolution.mockRejectedValueOnce({
    response: {
      status: 500,
      data: {
        message: '솔루션 재시도에 실패했습니다. 잠시 후 다시 시도해주세요.',
        status: 'FAILED',
        data: null,
      },
    },
  })
  render(
    <MemoryRouter>
      <SolutionPage />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '다시 확인하기' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    '솔루션 재시도에 실패했습니다.',
  )
  expect(getTodaySolution).toHaveBeenCalledTimes(1)
  expect(retryTodaySolution).toHaveBeenCalledTimes(1)
})
