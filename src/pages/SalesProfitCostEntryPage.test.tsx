import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SalesProfitCostEntryPage } from './SalesProfitCostEntryPage'

const { getSalesUploadCostEntry, saveSalesUploadCosts, getNotifications, navigate } = vi.hoisted(() => ({
  getSalesUploadCostEntry: vi.fn(),
  saveSalesUploadCosts: vi.fn(),
  getNotifications: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/sales/api/salesApi', () => ({
  getSalesUploadCostEntry,
  saveSalesUploadCosts,
}))

vi.mock('../features/notifications/api/notificationApi', () => ({ getNotifications }))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/sales/uploads/10/cost-items']}>
      <Routes>
        <Route path="/sales/uploads/:uploadId/cost-items" element={<SalesProfitCostEntryPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  getSalesUploadCostEntry.mockReset()
  saveSalesUploadCosts.mockReset()
  getNotifications.mockReset()
  navigate.mockReset()
  getNotifications.mockResolvedValue({ message: '조회 성공', nextCursor: null, data: { items: [] } })
})

test('여러 달의 확정값과 제안값을 표시하고 40%를 숫자 40으로 저장한다', async () => {
  getSalesUploadCostEntry.mockResolvedValue({
    uploadId: 10,
    months: [
      { costMonth: '2026-08', rentAmount: 1800000, laborAmount: 2400000,
        ingredientCostRate: 40, source: 'SAVED' },
      { costMonth: '2026-09', rentAmount: 1800000, laborAmount: 2400000,
        ingredientCostRate: 40, source: 'SUGGESTED' },
    ],
  })
  saveSalesUploadCosts.mockResolvedValue({ uploadId: 10, costMonths: ['2026-08', '2026-09'] })
  renderPage()

  expect(await screen.findByText('2026년 8월')).toBeInTheDocument()
  expect(screen.getByText('2026년 9월')).toBeInTheDocument()
  expect(screen.getByText('이전 저장값 · 이번 달 미저장')).toBeInTheDocument()
  expect(screen.getAllByDisplayValue('1,800,000')).toHaveLength(2)

  fireEvent.click(await screen.findByRole('button', { name: '다음 단계' }))
  await waitFor(() => expect(saveSalesUploadCosts).toHaveBeenCalledWith(10, [
    { costMonth: '2026-08', rentAmount: 1800000, laborAmount: 2400000, ingredientCostRate: 40 },
    { costMonth: '2026-09', rentAmount: 1800000, laborAmount: 2400000, ingredientCostRate: 40 },
  ]))
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/sales/analysis', {
    state: { refreshForecastAfterUpload: true },
  }))
})

test('월별 필수값이 비어 있으면 저장할 수 없다', async () => {
  getSalesUploadCostEntry.mockResolvedValue({
    uploadId: 10,
    months: [{ costMonth: '2026-09', rentAmount: null, laborAmount: null,
      ingredientCostRate: null, source: 'EMPTY' }],
  })
  renderPage()

  expect(await screen.findByText('2026년 9월')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '다음 단계' })).toBeDisabled()
  expect(await screen.findByText('임대료를 입력해주세요.')).toBeInTheDocument()
  expect(saveSalesUploadCosts).not.toHaveBeenCalled()
})

test('저장 실패 시 입력값을 유지한다', async () => {
  getSalesUploadCostEntry.mockResolvedValue({
    uploadId: 10,
    months: [{ costMonth: '2026-09', rentAmount: 1800000, laborAmount: 2400000,
      ingredientCostRate: 40, source: 'SAVED' }],
  })
  saveSalesUploadCosts.mockRejectedValue(new Error('network'))
  renderPage()

  fireEvent.click(await screen.findByRole('button', { name: '다음 단계' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('저장하지 못했습니다')
  expect(screen.getByDisplayValue('1,800,000')).toBeInTheDocument()
  expect(navigate).not.toHaveBeenCalled()
})
