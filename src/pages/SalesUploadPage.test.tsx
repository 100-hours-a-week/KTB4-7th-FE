import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SalesUploadPage } from './SalesUploadPage'

const { getSalesUploadHistory, uploadSalesFile, getNotifications, navigate } =
  vi.hoisted(() => ({
    getSalesUploadHistory: vi.fn(),
    uploadSalesFile: vi.fn(),
    getNotifications: vi.fn(),
    navigate: vi.fn(),
  }))

vi.mock('../features/sales/api/salesApi', () => ({
  getSalesUploadHistory,
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
  getSalesUploadHistory.mockReset()
  uploadSalesFile.mockReset()
  getNotifications.mockReset()
  navigate.mockReset()
  getSalesUploadHistory.mockResolvedValue(emptyHistory)
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })
})

test('지원하지 않는 매출 파일을 선택하면 오류를 표시한다', async () => {
  render(
    <MemoryRouter>
      <SalesUploadPage />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('매출 파일 선택'), {
    target: {
      files: [new File(['x'], 'sales.pdf', { type: 'application/pdf' })],
    },
  })

  expect(screen.getByRole('alert')).toHaveTextContent(
    'CSV 또는 엑셀 파일만 업로드할 수 있습니다.',
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

  expect(await within(connectionStatus).findByText('08.27')).toBeInTheDocument()
  expect(within(connectionStatus).getByText('3,204건')).toBeInTheDocument()
  expect(within(connectionStatus).getByText('최신')).toBeInTheDocument()
  expect(screen.getByText('202608_매출.xlsx')).toBeInTheDocument()
})

test('파일을 선택하고 분석 시작을 누르면 업로드 후 분석 페이지로 이동한다', async () => {
  uploadSalesFile.mockResolvedValue({ uploadId: 10, analysisRunId: 20 })

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
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/sales/analysis'))
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
      files: [new File(['x'], 'sales.csv', { type: 'text/csv' })],
    },
  })
  fireEvent.click(screen.getByRole('button', { name: '분석 시작' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '매출 파일 업로드에 실패했습니다. 다시 시도해 주세요.',
  )
})

test('업로드 기록이 여러 페이지면 다음/이전 버튼으로 페이지를 넘긴다', async () => {
  const pageOne = {
    connection: {
      lastUploadedAt: '2026-09-27T00:00:00+09:00',
      totalAppliedRecordCount: 20,
      latestStatus: 'COMPLETED',
    },
    items: [
      {
        uploadId: 2,
        fileName: '202609_매출.xlsx',
        uploadedAt: '2026-09-27T00:00:00+09:00',
        recordCount: 10,
        appliedRecordCount: 10,
        status: 'COMPLETED',
        failReason: null,
      },
    ],
    page: 1,
    size: 10,
    totalPages: 2,
    totalCount: 11,
  }
  const pageTwo = {
    ...pageOne,
    items: [
      {
        uploadId: 1,
        fileName: '202608_매출.xlsx',
        uploadedAt: '2026-08-27T00:00:00+09:00',
        recordCount: 10,
        appliedRecordCount: 10,
        status: 'COMPLETED',
        failReason: null,
      },
    ],
    page: 2,
  }
  getSalesUploadHistory.mockImplementation(({ page } = {}) =>
    Promise.resolve(page === 2 ? pageTwo : pageOne),
  )

  render(
    <MemoryRouter>
      <SalesUploadPage />
    </MemoryRouter>,
  )

  expect(await screen.findByText('202609_매출.xlsx')).toBeInTheDocument()
  expect(screen.getByText('1 / 2')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()

  fireEvent.click(screen.getByRole('button', { name: '다음' }))

  expect(await screen.findByText('202608_매출.xlsx')).toBeInTheDocument()
  expect(getSalesUploadHistory).toHaveBeenLastCalledWith({ page: 2 })
  expect(screen.getByText('2 / 2')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
})
