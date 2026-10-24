import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { SalesUploadPage } from './SalesUploadPage'

const {
  getSalesUploadHistory,
  getSalesUploadStatus,
  uploadSalesFile,
  getNotifications,
  navigate,
} = vi.hoisted(() => ({
  getSalesUploadHistory: vi.fn(),
  getSalesUploadStatus: vi.fn(),
  uploadSalesFile: vi.fn(),
  getNotifications: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/sales/api/salesApi', () => ({
  getSalesUploadHistory,
  getSalesUploadStatus,
  uploadSalesFile,
}))

vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

const emptyHistory = {
  connection: {
    lastUploadedAt: null,
    totalAppliedRecordCount: 0,
    latestStatus: null,
  },
  items: [],
  page: 1,
  size: 10,
  totalPages: 0,
  totalCount: 0,
}

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open')
    },
  })
  getSalesUploadHistory.mockReset()
  uploadSalesFile.mockReset()
  getSalesUploadStatus.mockReset()
  getNotifications.mockReset()
  navigate.mockReset()
  getSalesUploadHistory.mockResolvedValue(emptyHistory)
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })
})

afterEach(() => vi.useRealTimers())

test('지원하지 않는 매출 파일을 선택하면 오류를 표시한다', async () => {
  render(
    <MemoryRouter>
      <SalesUploadPage />
    </MemoryRouter>,
  )

  await waitFor(() => expect(getSalesUploadHistory).toHaveBeenCalled())

  fireEvent.change(screen.getByLabelText('매출 파일 선택'), {
    target: {
      files: [new File(['x'], 'sales.pdf', { type: 'application/pdf' })],
    },
  })

  expect(screen.getByRole('alert')).toHaveTextContent(
    'xlsx 파일만 업로드할 수 있습니다.',
  )
})

test('연결 상태와 업로드 기록을 실제 API로 불러온다', async () => {
  getSalesUploadHistory.mockResolvedValue({
    connection: {
      lastUploadedAt: '2026-08-27T00:00:00+09:00',
      totalAppliedRecordCount: 3204,
      latestStatus: 'COMPLETED',
    },
    items: [
      {
        uploadId: 1,
        fileName: '202608_매출.xlsx',
        uploadedAt: '2026-08-27T00:00:00+09:00',
        recordCount: 482,
        appliedRecordCount: 482,
        status: 'COMPLETED',
        failReason: null,
      },
    ],
    page: 1,
    size: 10,
    totalPages: 1,
    totalCount: 1,
  })

  const { container } = render(
    <MemoryRouter>
      <SalesUploadPage />
    </MemoryRouter>,
  )

  await waitFor(() => expect(getSalesUploadHistory).toHaveBeenCalled())

  const connectionStatus = container.querySelector(
    '.connection-status',
  ) as HTMLElement
  expect(connectionStatus).not.toBeNull()

  expect(
    within(connectionStatus).getByText('누적 반영 매출'),
  ).toBeInTheDocument()
  expect(await within(connectionStatus).findByText('08.27')).toBeInTheDocument()
  expect(
    within(connectionStatus).getByText(
      (_, element) => element?.textContent === '3,204건',
    ),
  ).toBeInTheDocument()
  expect(within(connectionStatus).getByText('최신')).toBeInTheDocument()
  expect(
    within(connectionStatus).getByText(
      '같은 기간을 다시 업로드한 경우에도 중복 없이 반영된 건수예요.',
    ),
  ).toBeInTheDocument()
  expect(screen.getByText('202608_매출.xlsx')).toBeInTheDocument()
})

test('파일 검증 완료 후 다음 단계를 눌러 비용 입력으로 이동한다', async () => {
  uploadSalesFile.mockResolvedValue({
    status: 'COMPLETED',
    data: { uploadId: 10, analysisRunId: 20 },
  })

  render(
    <MemoryRouter>
      <SalesUploadPage />
    </MemoryRouter>,
  )

  await waitFor(() => expect(getSalesUploadHistory).toHaveBeenCalled())

  fireEvent.change(screen.getByLabelText('매출 파일 선택'), {
    target: {
      files: [
        new File(['x'], 'sales.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      ],
    },
  })

  fireEvent.click(screen.getByRole('button', { name: '분석 시작' }))

  await waitFor(() => expect(uploadSalesFile).toHaveBeenCalled())
  expect(navigate).not.toHaveBeenCalled()
  const nextStep = await screen.findByRole('button', { name: '다음 단계' })
  expect(
    screen.queryByRole('button', { name: '분석 시작' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByText('파일 오류 검사가 완료됐어요.'),
  ).not.toBeInTheDocument()
  fireEvent.click(nextStep)
  expect(navigate).toHaveBeenCalledWith('/sales/uploads/10/cost-items')
})

test('xlsx가 아닌 파일은 선택할 수 없다', async () => {
  render(
    <MemoryRouter>
      <SalesUploadPage />
    </MemoryRouter>,
  )

  await waitFor(() => expect(getSalesUploadHistory).toHaveBeenCalled())

  fireEvent.change(screen.getByLabelText('매출 파일 선택'), {
    target: {
      files: [new File(['x'], 'sales.csv', { type: 'text/csv' })],
    },
  })

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'xlsx 파일만 업로드할 수 있습니다.',
  )
  expect(screen.getByRole('button', { name: '분석 시작' })).toBeDisabled()
})

test('업로드에 실패하면 오류 메시지를 보여준다', async () => {
  uploadSalesFile.mockRejectedValue(new Error('network error'))

  render(
    <MemoryRouter>
      <SalesUploadPage />
    </MemoryRouter>,
  )

  await waitFor(() => expect(getSalesUploadHistory).toHaveBeenCalled())

  fireEvent.change(screen.getByLabelText('매출 파일 선택'), {
    target: {
      files: [
        new File(['x'], 'sales.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      ],
    },
  })
  fireEvent.click(screen.getByRole('button', { name: '분석 시작' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '매출 파일 업로드에 실패했습니다. 다시 시도해 주세요.',
  )
})

test('업로드 기록은 5개씩 표시하고 버튼과 가로 스와이프로 넘긴다', async () => {
  const items = Array.from({ length: 11 }, (_, i) => ({
    uploadId: i + 1,
    fileName: `매출-${i + 1}.xlsx`,
    uploadedAt: '2026-10-17T00:00:00+09:00',
    recordCount: 10,
    appliedRecordCount: 10,
    status: 'COMPLETED',
    failReason: null,
  }))
  getSalesUploadHistory.mockImplementation(({ page = 1 } = {}) =>
    Promise.resolve({
      ...emptyHistory,
      items: items.slice((page - 1) * 10, page * 10),
      page,
      size: 10,
      totalPages: 2,
      totalCount: 11,
    }),
  )
  render(
    <MemoryRouter>
      <SalesUploadPage />
    </MemoryRouter>,
  )
  expect(await screen.findByText('매출-1.xlsx')).toBeInTheDocument()
  expect(screen.getByText('매출-5.xlsx')).toBeInTheDocument()
  expect(screen.queryByText('매출-6.xlsx')).not.toBeInTheDocument()
  expect(screen.getByText('1 / 3')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  expect(await screen.findByText('매출-6.xlsx')).toBeInTheDocument()
  expect(screen.queryByText('매출-1.xlsx')).not.toBeInTheDocument()
  expect(screen.getByText('2 / 3')).toBeInTheDocument()
  const list = screen.getByLabelText('업로드 기록 목록')
  fireEvent.touchStart(list, { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchEnd(list, { changedTouches: [{ clientX: 80, clientY: 105 }] })
  expect(await screen.findByText('매출-11.xlsx')).toBeInTheDocument()
  expect(getSalesUploadHistory).toHaveBeenLastCalledWith({ page: 2, size: 10 })
  expect(screen.getByText('3 / 3')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  fireEvent.touchStart(list, { touches: [{ clientX: 80, clientY: 100 }] })
  fireEvent.touchEnd(list, { changedTouches: [{ clientX: 200, clientY: 105 }] })
  expect(await screen.findByText('매출-6.xlsx')).toBeInTheDocument()
  expect(screen.getByText('2 / 3')).toBeInTheDocument()
  fireEvent.touchStart(list, { touches: [{ clientX: 80, clientY: 100 }] })
  fireEvent.touchEnd(list, { changedTouches: [{ clientX: 85, clientY: 240 }] })
  expect(screen.getByText('2 / 3')).toBeInTheDocument()
})

test('분석 요청을 기다리는 동안 진행 상태를 알리고 중복 제출을 막는다', async () => {
  let finishUpload!: (value: unknown) => void
  uploadSalesFile.mockReturnValue(
    new Promise((resolve) => {
      finishUpload = resolve
    }),
  )
  render(
    <MemoryRouter>
      <SalesUploadPage />
    </MemoryRouter>,
  )
  await waitFor(() => expect(getSalesUploadHistory).toHaveBeenCalled())
  fireEvent.change(screen.getByLabelText('매출 파일 선택'), {
    target: { files: [new File(['x'], 'sales.xlsx')] },
  })
  fireEvent.click(screen.getByRole('button', { name: '분석 시작' }))
  const pendingButton = await screen.findByRole('button', {
    name: '분석 중...',
  })
  expect(pendingButton).toBeDisabled()
  expect(pendingButton).toHaveAttribute('aria-busy', 'true')
  expect(
    screen.getByRole('dialog', { name: '매출을 분석하고 있어요' }),
  ).toHaveAttribute('aria-modal', 'true')
  expect(screen.getByRole('status')).toHaveTextContent('매출을 분석하고 있어요')
  await act(async () => {
    finishUpload({
      status: 'COMPLETED',
      data: { uploadId: 10, analysisRunId: 20 },
    })
  })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(navigate).not.toHaveBeenCalled()
})

function uploadStatus(
  status: string,
  message = '매출 파일을 처리하고 있습니다.',
) {
  return {
    message,
    status,
    failReason: null,
    data: {
      uploadId: 10,
      analysisRunId: 20,
      processingPhase: null,
      analysisId: status === 'COMPLETED' ? 30 : null,
      aiInsightStatus: 'PENDING',
      retryable: false,
    },
  }
}

async function startAcceptedUpload() {
  uploadSalesFile.mockResolvedValue({
    status: 'PENDING',
    message: '접수했습니다.',
    data: { uploadId: 10, analysisRunId: 20, processingPhase: null },
  })
  const result = render(
    <MemoryRouter>
      <SalesUploadPage />
    </MemoryRouter>,
  )
  await act(async () => {})
  await act(async () => {
    fireEvent.change(screen.getByLabelText('매출 파일 선택'), {
      target: { files: [new File(['x'], 'sales.xlsx')] },
    })
    fireEvent.click(screen.getByRole('button', { name: '분석 시작' }))
  })
  return result
}

test('비동기 접수 후 상태를 반복 조회하고 완료된 다음에만 다음 단계를 허용한다', async () => {
  vi.useFakeTimers()
  getSalesUploadStatus
    .mockResolvedValueOnce(uploadStatus('PENDING', '처리를 기다리고 있습니다.'))
    .mockResolvedValueOnce(
      uploadStatus('PROCESSING', '파일을 검증하고 있습니다.'),
    )
    .mockResolvedValueOnce(uploadStatus('COMPLETED'))
  await startAcceptedUpload()
  expect(screen.getByRole('dialog')).toHaveTextContent(
    '처리를 기다리고 있습니다.',
  )
  expect(
    screen.queryByRole('button', { name: '다음 단계' }),
  ).not.toBeInTheDocument()
  expect(screen.getByLabelText('매출 파일 선택')).toBeDisabled()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500)
  })
  expect(screen.getByRole('dialog')).toHaveTextContent(
    '파일을 검증하고 있습니다.',
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500)
  })
  expect(screen.getByRole('button', { name: '다음 단계' })).toBeEnabled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(6000)
  })
  expect(getSalesUploadStatus).toHaveBeenCalledTimes(3)
  expect(uploadSalesFile).toHaveBeenCalledTimes(1)
})

test('비동기 처리 실패는 상태 응답의 안내를 표시하고 조회를 종료한다', async () => {
  vi.useFakeTimers()
  getSalesUploadStatus.mockResolvedValue(
    uploadStatus('FAILED', '필수 시트가 없습니다.'),
  )
  await startAcceptedUpload()
  expect(screen.getByRole('alert')).toHaveTextContent('필수 시트가 없습니다.')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: '다음 단계' }),
  ).not.toBeInTheDocument()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000)
  })
  expect(getSalesUploadStatus).toHaveBeenCalledTimes(1)
})

test('상태 조회 오류는 같은 업로드를 다시 조회하고 파일을 재전송하지 않는다', async () => {
  getSalesUploadStatus.mockRejectedValueOnce(new Error('offline'))
  await startAcceptedUpload()
  expect(screen.getByRole('alert')).toHaveTextContent(
    '상태를 다시 확인해 주세요.',
  )
  getSalesUploadStatus.mockResolvedValueOnce(uploadStatus('COMPLETED'))
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '상태 다시 확인' }))
  })
  expect(screen.getByRole('button', { name: '다음 단계' })).toBeEnabled()
  expect(uploadSalesFile).toHaveBeenCalledTimes(1)
  expect(getSalesUploadStatus).toHaveBeenCalledTimes(2)
})

test('상태 조회 중 인증이 만료되면 로그인으로 이동한다', async () => {
  getSalesUploadStatus.mockRejectedValue({ response: { status: 401 } })
  await startAcceptedUpload()
  expect(navigate).toHaveBeenCalledWith('/login')
})

test('화면을 벗어나면 예약된 상태 조회를 중단한다', async () => {
  vi.useFakeTimers()
  getSalesUploadStatus.mockResolvedValue(uploadStatus('PROCESSING'))
  const { unmount } = await startAcceptedUpload()
  const signal = getSalesUploadStatus.mock.calls[0][1] as AbortSignal
  unmount()
  expect(signal.aborted).toBe(true)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000)
  })
  expect(getSalesUploadStatus).toHaveBeenCalledTimes(1)
})

test('진행 중인 상태 조회 응답이 늦게 도착해도 화면 종료 후 다시 조회하지 않는다', async () => {
  vi.useFakeTimers()
  let resolveStatus!: (value: unknown) => void
  getSalesUploadStatus.mockReturnValue(
    new Promise((resolve) => {
      resolveStatus = resolve
    }),
  )
  const { unmount } = await startAcceptedUpload()
  unmount()
  await act(async () => {
    resolveStatus(uploadStatus('PROCESSING'))
    await vi.advanceTimersByTimeAsync(5000)
  })
  expect(getSalesUploadStatus).toHaveBeenCalledTimes(1)
})
