import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SalesProfitCostEntryPage } from './SalesProfitCostEntryPage'

const {
  getSalesUploadCostEntry,
  saveSalesUploadCosts,
  getNotifications,
  navigate,
} = vi.hoisted(() => ({
  getSalesUploadCostEntry: vi.fn(),
  saveSalesUploadCosts: vi.fn(),
  getNotifications: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/sales/api/salesApi', () => ({
  getSalesUploadCostEntry,
  saveSalesUploadCosts,
}))

vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/sales/uploads/10/cost-items']}>
      <Routes>
        <Route
          path="/sales/uploads/:uploadId/cost-items"
          element={<SalesProfitCostEntryPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  getSalesUploadCostEntry.mockReset()
  saveSalesUploadCosts.mockReset()
  getNotifications.mockReset()
  navigate.mockReset()
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })
})

test('월별로 이동하며 직전 달 입력값을 다음 달에 채우고 마지막에 모두 저장한다', async () => {
  getSalesUploadCostEntry.mockResolvedValue({
    uploadId: 10,
    months: [
      {
        costMonth: '2026-01',
        rentAmount: null,
        laborAmount: null,
        ingredientCostRate: null,
        source: 'EMPTY',
      },
      {
        costMonth: '2026-02',
        rentAmount: 900000,
        laborAmount: 1000000,
        ingredientCostRate: 20,
        source: 'SUGGESTED',
      },
    ],
  })
  saveSalesUploadCosts.mockResolvedValue({
    uploadId: 10,
    costMonths: ['2026-01', '2026-02'],
  })
  renderPage()

  expect(
    await screen.findByText('2026년 1월', { selector: 'h2' }),
  ).toBeVisible()
  expect(screen.getByText('2026년 2월', { selector: 'h2' })).not.toBeVisible()
  const january = screen
    .getByText('2026년 1월', { selector: 'h2' })
    .closest('section')!
  fireEvent.change(january.querySelectorAll('input')[0], {
    target: { value: '1300000' },
  })
  fireEvent.change(january.querySelectorAll('input')[1], {
    target: { value: '2400000' },
  })
  fireEvent.change(january.querySelectorAll('input')[2], {
    target: { value: '40' },
  })
  fireEvent.click(screen.getByRole('button', { name: '다음 달 입력' }))

  expect(
    await screen.findByText('2026년 2월', { selector: 'h2' }),
  ).toBeVisible()
  expect(screen.getByText('2026년 1월', { selector: 'h2' })).not.toBeVisible()
  expect(saveSalesUploadCosts).not.toHaveBeenCalled()
  const february = screen
    .getByText('2026년 2월', { selector: 'h2' })
    .closest('section')!
  expect(february.querySelectorAll('input')[0]).toHaveValue('1,300,000')
  expect(february.querySelectorAll('input')[1]).toHaveValue('2,400,000')
  expect(february.querySelectorAll('input')[2]).toHaveValue('40')

  fireEvent.click(screen.getByRole('button', { name: '저장하고 분석 보기' }))
  await waitFor(() =>
    expect(saveSalesUploadCosts).toHaveBeenCalledWith(10, [
      {
        costMonth: '2026-01',
        rentAmount: 1300000,
        laborAmount: 2400000,
        ingredientCostRate: 40,
      },
      {
        costMonth: '2026-02',
        rentAmount: 1300000,
        laborAmount: 2400000,
        ingredientCostRate: 40,
      },
    ]),
  )
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith('/sales/analysis', {
      state: { refreshForecastAfterUpload: true },
    }),
  )
})

test('월별 필수값이 비어 있으면 저장할 수 없다', async () => {
  getSalesUploadCostEntry.mockResolvedValue({
    uploadId: 10,
    months: [
      {
        costMonth: '2026-09',
        rentAmount: null,
        laborAmount: null,
        ingredientCostRate: null,
        source: 'EMPTY',
      },
    ],
  })
  renderPage()

  expect(await screen.findByText('2026년 9월')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '저장하고 분석 보기' }))
  expect(await screen.findByText('임대료를 입력해주세요.')).toBeInTheDocument()
  expect(saveSalesUploadCosts).not.toHaveBeenCalled()
})

test('비용을 입력하지 않고 건너뛰면 저장 요청 없이 매출 분석으로 이동한다', async () => {
  getSalesUploadCostEntry.mockResolvedValue({
    uploadId: 10,
    months: [
      {
        costMonth: '2026-09',
        rentAmount: null,
        laborAmount: null,
        ingredientCostRate: null,
        source: 'EMPTY',
      },
      {
        costMonth: '2026-10',
        rentAmount: null,
        laborAmount: null,
        ingredientCostRate: null,
        source: 'EMPTY',
      },
    ],
  })
  renderPage()

  fireEvent.click(
    await screen.findByRole('button', { name: '건너뛰고 매출 분석 보기' }),
  )

  expect(saveSalesUploadCosts).not.toHaveBeenCalled()
  expect(navigate).toHaveBeenCalledWith('/sales/analysis', {
    state: { refreshForecastAfterUpload: true },
  })
  expect(screen.queryByText('임대료를 입력해주세요.')).not.toBeInTheDocument()
})

test('비용 조회가 실패해도 매출 분석은 건너뛰어 볼 수 있다', async () => {
  getSalesUploadCostEntry.mockRejectedValue(new Error('network'))
  renderPage()

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '불러오지 못했습니다',
  )
  fireEvent.click(
    screen.getByRole('button', { name: '건너뛰고 매출 분석 보기' }),
  )

  expect(saveSalesUploadCosts).not.toHaveBeenCalled()
  expect(navigate).toHaveBeenCalledWith('/sales/analysis', {
    state: { refreshForecastAfterUpload: true },
  })
})

test('이미 저장된 다음 달 값과 다시 방문한 달의 수정값은 유지한다', async () => {
  getSalesUploadCostEntry.mockResolvedValue({
    uploadId: 10,
    months: [
      {
        costMonth: '2026-01',
        rentAmount: 1300000,
        laborAmount: 2400000,
        ingredientCostRate: 40,
        source: 'SAVED',
      },
      {
        costMonth: '2026-02',
        rentAmount: 1500000,
        laborAmount: 2600000,
        ingredientCostRate: 45,
        source: 'SAVED',
      },
    ],
  })
  renderPage()

  expect(
    await screen.findByText('2026년 1월', { selector: 'h2' }),
  ).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '다음 달 입력' }))
  const february = await screen.findByText('2026년 2월', { selector: 'h2' })
  await waitFor(() => expect(february).toBeVisible())
  const rent = february.closest('section')!.querySelectorAll('input')[0]
  expect(rent).toHaveValue('1,500,000')
  fireEvent.change(rent, { target: { value: '1700000' } })
  fireEvent.click(screen.getByRole('button', { name: '이전 달' }))
  fireEvent.click(screen.getByRole('button', { name: '다음 달 입력' }))
  await waitFor(() => expect(february).toBeVisible())
  expect(rent).toHaveValue('1,700,000')
})

test('저장 실패 시 입력값을 유지한다', async () => {
  getSalesUploadCostEntry.mockResolvedValue({
    uploadId: 10,
    months: [
      {
        costMonth: '2026-09',
        rentAmount: 1800000,
        laborAmount: 2400000,
        ingredientCostRate: 40,
        source: 'SAVED',
      },
    ],
  })
  saveSalesUploadCosts.mockRejectedValue(new Error('network'))
  renderPage()

  fireEvent.click(
    await screen.findByRole('button', { name: '저장하고 분석 보기' }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    '저장하지 못했습니다',
  )
  expect(screen.getByDisplayValue('1,800,000')).toBeInTheDocument()
  expect(navigate).not.toHaveBeenCalled()
})
